import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  Animation,
  AnimationKeys,
  PointLight
} from '@babylonjs/core';

export interface AudioSpectrumConfig {
  bandCount: number;
  radius: number;
  maxHeight: number;
  smoothingFactor: number;
}

export class AudioSpectrum {
  private scene: Scene;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private spectrumBars: Mesh[] = [];
  private materials: PBRMaterial[] = [];
  private spectrumLights: PointLight[] = [];
  private config: AudioSpectrumConfig;
  private smoothedData: number[] = [];
  private animationFrame: number | null = null;

  constructor(scene: Scene, config: AudioSpectrumConfig) {
    this.scene = scene;
    this.config = config;
    this.smoothedData = new Array(config.bandCount).fill(0);
    
    this.createSpectrumBars();
    this.initializeAudio();
  }

  private createSpectrumBars(): void {
    const spacing = 1.5; // Distance between bars
    const totalWidth = (this.config.bandCount - 1) * spacing;
    const startX = -totalWidth / 2; // Center the line
    
    for (let i = 0; i < this.config.bandCount; i++) {
      // Create cylindrical bar
      const bar = MeshBuilder.CreateCylinder(`spectrumBar_${i}`, {
        height: 0.5,
        diameter: 0.8,
        tessellation: 16
      }, this.scene);

      // Position bars in a line
      const x = startX + (i * spacing);
      bar.position.set(x, 0.25, 8); // Fixed Z position in front of user

      // Create beautiful gradient material
      const material = new PBRMaterial(`spectrumMaterial_${i}`, this.scene);
      
      // Cyberpunk neon colors (electric blue to hot pink)
      const progress = i / (this.config.bandCount - 1);
      const baseColor = this.getCyberpunkColor(progress);
      
      material.baseColor = new Color3(baseColor.r * 0.2, baseColor.g * 0.2, baseColor.b * 0.2);
      material.roughness = 0.1;
      material.metallicFactor = 0.9;
      material.emissiveColor = new Color3(baseColor.r * 0.5, baseColor.g * 0.5, baseColor.b * 0.5);
      
      bar.material = material;
      
      // Create point light for each spectrum bar
      const light = new PointLight(`spectrumLight_${i}`, bar.position.clone(), this.scene);
      light.diffuse = new Color3(baseColor.r, baseColor.g, baseColor.b);
      light.intensity = 0.5;
      light.range = 8;
      
      this.spectrumBars.push(bar);
      this.materials.push(material);
      this.spectrumLights.push(light);
    }
  }

  private getCyberpunkColor(progress: number): { r: number; g: number; b: number } {
    // Electric blue to hot pink gradient
    if (progress < 0.33) {
      // Electric blue to cyan
      const t = progress / 0.33;
      return {
        r: 0 * (1 - t) + 0 * t,
        g: 0.5 * (1 - t) + 1 * t,
        b: 1
      };
    } else if (progress < 0.66) {
      // Cyan to magenta
      const t = (progress - 0.33) / 0.33;
      return {
        r: 0 * (1 - t) + 1 * t,
        g: 1 * (1 - t) + 0 * t,
        b: 1
      };
    } else {
      // Magenta to hot pink
      const t = (progress - 0.66) / 0.34;
      return {
        r: 1,
        g: 0 * (1 - t) + 0.2 * t,
        b: 1 * (1 - t) + 0.8 * t
      };
    }
  }

  private async initializeAudio(): Promise<void> {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256; // Higher resolution for better frequency analysis
      this.analyser.smoothingTimeConstant = 0.3; // More responsive to audio changes
      
      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      // Initialize frequency data array
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Start animation loop
      this.startVisualization();
      
      console.log('Audio spectrum initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      // Create fallback animation for demo purposes
      this.createFallbackAnimation();
    }
  }

  private startVisualization(): void {
    const animate = () => {
      if (!this.analyser || !this.frequencyData) return;
      
      // Get frequency data
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      // Process frequency bands
      this.processFrequencyBands();
      
      // Update visual elements
      this.updateSpectrumBars();
      
      // Continue animation
      this.animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
  }

  private processFrequencyBands(): void {
    if (!this.frequencyData) return;
    
    const bandsPerBar = Math.floor(this.frequencyData.length / this.config.bandCount);
    
    for (let i = 0; i < this.config.bandCount; i++) {
      let sum = 0;
      const startIndex = i * bandsPerBar;
      const endIndex = Math.min(startIndex + bandsPerBar, this.frequencyData.length);
      
      // Average the frequency data for this band
      for (let j = startIndex; j < endIndex; j++) {
        sum += this.frequencyData[j];
      }
      
      const average = sum / (endIndex - startIndex);
      const normalized = Math.min((average / 255) * 2.5, 1); // Amplify sensitivity by 2.5x
      
      // Apply smoothing
      this.smoothedData[i] = this.smoothedData[i] * 0.7 + 
                            normalized * 0.3; // Faster response time
    }
  }

  private updateSpectrumBars(): void {
    for (let i = 0; i < this.spectrumBars.length; i++) {
      const bar = this.spectrumBars[i];
      const material = this.materials[i];
      const light = this.spectrumLights[i];
      const intensity = this.smoothedData[i];
      
      // Scale bar height based on audio intensity
      const targetHeight = 0.5 + (intensity * this.config.maxHeight);
      bar.scaling.y = targetHeight;
      bar.position.y = targetHeight / 2;
      
      // Update light position to follow bar
      light.position.y = bar.position.y + targetHeight / 2;
      
      // Update emissive color and light intensity for glow effect
      const baseEmissive = 0.3;
      const emissiveIntensity = baseEmissive + (intensity * 1.2);
      const baseColor = material.baseColor;
      
      material.emissiveColor = new Color3(
        (baseColor.r / 0.2) * emissiveIntensity,
        (baseColor.g / 0.2) * emissiveIntensity,
        (baseColor.b / 0.2) * emissiveIntensity
      );
      
      // Update light intensity based on audio
      light.intensity = 0.5 + (intensity * 2.0); // More dramatic lighting
      
      // Subtle rotation for visual interest
      bar.rotation.y += 0.005 * (1 + intensity);
    }
  }

  private createFallbackAnimation(): void {
    // Create a gentle sine wave animation as fallback
    let time = 0;
    
    const animate = () => {
      time += 0.02;
      
      for (let i = 0; i < this.spectrumBars.length; i++) {
        const bar = this.spectrumBars[i];
        const material = this.materials[i];
        const light = this.spectrumLights[i];
        
        // Create wave pattern
        const wave = Math.sin(time + i * 0.5) * 0.5 + 0.5;
        const intensity = wave * 0.3 + 0.1; // Gentle movement
        
        // Update bar
        const targetHeight = 0.5 + (intensity * this.config.maxHeight * 0.5);
        bar.scaling.y = targetHeight;
        bar.position.y = targetHeight / 2;
        
        // Update light position
        light.position.y = bar.position.y + targetHeight / 2;
        
        // Update glow
        const baseColor = material.baseColor;
        const emissiveIntensity = 0.3 + (intensity * 0.5);
        
        material.emissiveColor = new Color3(
          (baseColor.r / 0.2) * emissiveIntensity,
          (baseColor.g / 0.2) * emissiveIntensity,
          (baseColor.b / 0.2) * emissiveIntensity
        );
        
        // Update light intensity
        light.intensity = 0.5 + (intensity * 1.5);
        
        bar.rotation.y += 0.002;
      }
      
      this.animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    console.log('Using fallback animation for audio spectrum');
  }

  public getSpectrumLights(): PointLight[] {
    return this.spectrumLights;
  }
  public dispose(): void {
    // Stop animation
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Clean up audio resources
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Dispose 3D objects
    this.spectrumBars.forEach(bar => {
      bar.dispose();
    });
    
    this.materials.forEach(material => {
      material.dispose();
    });
    
    this.spectrumLights.forEach(light => {
      light.dispose();
    });
    
    this.spectrumBars = [];
    this.materials = [];
    this.spectrumLights = [];
    
    console.log('Audio spectrum disposed');
  }
}