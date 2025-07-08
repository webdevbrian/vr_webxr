import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  Animation,
  AnimationKeys
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
      
      // Color based on frequency band (purple to cyan gradient)
      const hue = (i / this.config.bandCount) * 0.7; // 0 to 0.7 for purple to cyan
      const baseColor = this.hslToRgb(hue, 0.8, 0.6);
      
      material.baseColor = new Color3(baseColor.r, baseColor.g, baseColor.b);
      material.roughness = 0.3;
      material.metallicFactor = 0.1;
      material.emissiveColor = new Color3(baseColor.r * 0.2, baseColor.g * 0.2, baseColor.b * 0.2);
      
      bar.material = material;
      
      this.spectrumBars.push(bar);
      this.materials.push(material);
    }
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: r + m,
      g: g + m,
      b: b + m
    };
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
      const intensity = this.smoothedData[i];
      
      // Scale bar height based on audio intensity
      const targetHeight = 0.5 + (intensity * this.config.maxHeight);
      bar.scaling.y = targetHeight;
      bar.position.y = targetHeight / 2;
      
      // Update emissive color for glow effect
      const baseEmissive = 0.2;
      const emissiveIntensity = baseEmissive + (intensity * 0.8);
      const baseColor = material.baseColor;
      
      material.emissiveColor = new Color3(
        baseColor.r * emissiveIntensity,
        baseColor.g * emissiveIntensity,
        baseColor.b * emissiveIntensity
      );
      
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
        
        // Create wave pattern
        const wave = Math.sin(time + i * 0.5) * 0.5 + 0.5;
        const intensity = wave * 0.3 + 0.1; // Gentle movement
        
        // Update bar
        const targetHeight = 0.5 + (intensity * this.config.maxHeight * 0.5);
        bar.scaling.y = targetHeight;
        bar.position.y = targetHeight / 2;
        
        // Update glow
        const baseColor = material.baseColor;
        const emissiveIntensity = 0.2 + (intensity * 0.3);
        
        material.emissiveColor = new Color3(
          baseColor.r * emissiveIntensity,
          baseColor.g * emissiveIntensity,
          baseColor.b * emissiveIntensity
        );
        
        bar.rotation.y += 0.002;
      }
      
      this.animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    console.log('Using fallback animation for audio spectrum');
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
    
    this.spectrumBars = [];
    this.materials = [];
    
    console.log('Audio spectrum disposed');
  }
}