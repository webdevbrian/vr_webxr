import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  Animation,
  AnimationKeys,
  PointLight,
  ParticleSystem,
  Texture
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
  private particleSystems: ParticleSystem[] = [];

  constructor(scene: Scene, config: AudioSpectrumConfig) {
    this.scene = scene;
    this.config = config;
    this.smoothedData = new Array(config.bandCount).fill(0);
    
    this.createSpectrumBars();
    this.createParticleSystems();
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
      
      material.baseColor = new Color3(baseColor.r * 0.4, baseColor.g * 0.4, baseColor.b * 0.4); // Brighter base for more bloom
      material.roughness = 0.05; // Even smoother for more reflective glow
      material.metallicFactor = 0.9;
      material.emissiveColor = new Color3(baseColor.r * 1.5, baseColor.g * 1.5, baseColor.b * 1.5); // Much stronger initial glow
      
      bar.material = material;
      
      // Create point light for each spectrum bar
      const light = new PointLight(`spectrumLight_${i}`, bar.position.clone(), this.scene);
      light.diffuse = new Color3(baseColor.r, baseColor.g, baseColor.b);
      light.intensity = 3.0; // Much brighter initial intensity
      light.range = 15; // Larger range for more bloom spread
      
      this.spectrumBars.push(bar);
      this.materials.push(material);
      this.spectrumLights.push(light);
    }
  }

  private createParticleSystems(): void {
    for (let i = 0; i < this.config.bandCount; i++) {
      const bar = this.spectrumBars[i];
      const baseColor = this.getCyberpunkColor(i / (this.config.bandCount - 1));
      
      // Create particle system for each spectrum bar
      const particleSystem = new ParticleSystem(`spectrumParticles_${i}`, 200, this.scene);
      
      // Set the particle emitter to the top of the spectrum bar
      particleSystem.emitter = bar;
      particleSystem.minEmitBox = new Vector3(-0.2, 0.5, -0.2); // Small area at top of bar
      particleSystem.maxEmitBox = new Vector3(0.2, 0.8, 0.2);
      
      // Create a simple white texture for particles (will be tinted by color)
      particleSystem.particleTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);
      
      // Particle appearance
      particleSystem.color1 = new Color3(baseColor.r, baseColor.g, baseColor.b);
      particleSystem.color2 = new Color3(baseColor.r * 0.8, baseColor.g * 0.8, baseColor.b * 0.8);
      particleSystem.colorDead = new Color3(baseColor.r * 0.2, baseColor.g * 0.2, baseColor.b * 0.2);
      
      // Particle size
      particleSystem.minSize = 0.1;
      particleSystem.maxSize = 0.4;
      
      // Particle lifetime
      particleSystem.minLifeTime = 0.8;
      particleSystem.maxLifeTime = 2.0;
      
      // Emission rate (will be controlled by audio)
      particleSystem.emitRate = 10; // Base emission rate
      
      // Particle speed and direction
      particleSystem.minEmitPower = 2;
      particleSystem.maxEmitPower = 6;
      particleSystem.updateSpeed = 0.02;
      
      // Gravity effect
      particleSystem.gravity = new Vector3(0, -2, 0);
      
      // Direction - particles shoot upward and outward
      particleSystem.direction1 = new Vector3(-0.5, 1, -0.5);
      particleSystem.direction2 = new Vector3(0.5, 2, 0.5);
      
      // Blending mode for glow effect
      particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
      
      // Start the particle system
      particleSystem.start();
      
      this.particleSystems.push(particleSystem);
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
      
      // Update emissive color and light intensity for MUCH stronger glow effect
      const baseEmissive = 0.8; // Much higher base glow
      const emissiveIntensity = baseEmissive + (intensity * 3.5); // Much stronger intensity multiplier
      const baseColor = material.baseColor;
      
      material.emissiveColor = new Color3(
        (baseColor.r / 0.2) * emissiveIntensity * 2.0, // Double the emissive strength
        (baseColor.g / 0.2) * emissiveIntensity * 2.0,
        (baseColor.b / 0.2) * emissiveIntensity * 2.0
      );
      
      // Update light intensity based on audio - MUCH brighter for bloom
      light.intensity = 2.0 + (intensity * 8.0); // Extremely bright for maximum bloom
      light.range = 12 + (intensity * 8); // Dynamic range based on intensity
      
      // Update particle system based on audio intensity
      const particleSystem = this.particleSystems[i];
      if (particleSystem) {
        // Dramatically increase particle emission based on audio intensity
        particleSystem.emitRate = 10 + (intensity * 150); // Much more particles when audio is active
        
        // Increase particle power/speed based on intensity
        particleSystem.minEmitPower = 2 + (intensity * 8);
        particleSystem.maxEmitPower = 6 + (intensity * 15);
        
        // Make particles larger and brighter with more audio activity
        particleSystem.minSize = 0.1 + (intensity * 0.3);
        particleSystem.maxSize = 0.4 + (intensity * 0.8);
        
        // Update particle colors to be brighter with more intensity
        const baseColor = this.getCyberpunkColor(i / (this.config.bandCount - 1));
        const colorIntensity = 1.0 + (intensity * 2.0);
        particleSystem.color1 = new Color3(
          Math.min(baseColor.r * colorIntensity, 1.0),
          Math.min(baseColor.g * colorIntensity, 1.0),
          Math.min(baseColor.b * colorIntensity, 1.0)
        );
        particleSystem.color2 = new Color3(
          Math.min(baseColor.r * colorIntensity * 0.8, 1.0),
          Math.min(baseColor.g * colorIntensity * 0.8, 1.0),
          Math.min(baseColor.b * colorIntensity * 0.8, 1.0)
        );
        
        // Update emitter position to follow the bar height
        particleSystem.minEmitBox = new Vector3(-0.2, targetHeight - 0.3, -0.2);
        particleSystem.maxEmitBox = new Vector3(0.2, targetHeight + 0.2, 0.2);
      }
      
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
        
        // Update glow - much stronger for fallback animation too
        const baseColor = material.baseColor;
        const emissiveIntensity = 1.2 + (intensity * 2.0); // Much stronger fallback glow
        
        material.emissiveColor = new Color3(
          (baseColor.r / 0.4) * emissiveIntensity * 1.8, // Stronger fallback emissive
          (baseColor.g / 0.4) * emissiveIntensity * 1.8,
          (baseColor.b / 0.4) * emissiveIntensity * 1.8
        );
        
        // Update light intensity
        light.intensity = 2.5 + (intensity * 4.0); // Much brighter fallback lighting
        light.range = 12 + (intensity * 6); // Dynamic range for fallback too
        
        // Update particle system for fallback animation
        const particleSystem = this.particleSystems[i];
        if (particleSystem) {
          particleSystem.emitRate = 15 + (intensity * 80); // Moderate particle emission for fallback
          particleSystem.minEmitPower = 2 + (intensity * 4);
          particleSystem.maxEmitPower = 6 + (intensity * 8);
          particleSystem.minSize = 0.1 + (intensity * 0.2);
          particleSystem.maxSize = 0.4 + (intensity * 0.5);
          
          // Update emitter position for fallback
          particleSystem.minEmitBox = new Vector3(-0.2, targetHeight - 0.3, -0.2);
          particleSystem.maxEmitBox = new Vector3(0.2, targetHeight + 0.2, 0.2);
        }
        
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
    
    this.particleSystems.forEach(particleSystem => {
      particleSystem.dispose();
    });
    
    this.spectrumBars = [];
    this.materials = [];
    this.spectrumLights = [];
    this.particleSystems = [];
    
    console.log('Audio spectrum disposed');
  }
}