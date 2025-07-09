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

interface ParticleData {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  cylinderIndex: number;
}

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
  private particlePool: ParticleData[] = [];
  private particleEmissionTimers: number[] = [];
  private maxParticlesPerCylinder = 10;

  constructor(scene: Scene, config: AudioSpectrumConfig) {
    this.scene = scene;
    this.config = config;
    this.smoothedData = new Array(config.bandCount).fill(0);
    this.particleEmissionTimers = new Array(config.bandCount).fill(0);
    
    this.createSpectrumBars();
    this.initializeParticlePool();
    this.initializeAudio();
  }

  private initializeParticlePool(): void {
    const totalParticles = this.config.bandCount * this.maxParticlesPerCylinder;
    
    for (let i = 0; i < totalParticles; i++) {
      const cylinderIndex = Math.floor(i / this.maxParticlesPerCylinder);
      
      // Create small circular particle mesh
      const particle = MeshBuilder.CreateSphere(`particle_${i}`, {
        diameter: 0.1,
        segments: 8 // Low poly for performance
      }, this.scene);
      
      // Create glowing material
      const material = new PBRMaterial(`particleMaterial_${i}`, this.scene);
      const progress = cylinderIndex / (this.config.bandCount - 1);
      const baseColor = this.getCyberpunkColor(progress);
      
      material.baseColor = new Color3(baseColor.r * 0.3, baseColor.g * 0.3, baseColor.b * 0.3);
      material.roughness = 0.1;
      material.metallicFactor = 0.8;
      material.emissiveColor = new Color3(baseColor.r * 1.2, baseColor.g * 1.2, baseColor.b * 1.2);
      material.alpha = 0.8;
      
      particle.material = material;
      particle.setEnabled(false); // Start disabled
      
      // Create particle data
      const particleData: ParticleData = {
        mesh: particle,
        velocity: new Vector3(0, 0, 0),
        life: 0,
        maxLife: 3.0, // 3 seconds lifespan
        active: false,
        cylinderIndex: cylinderIndex
      };
      
      this.particlePool.push(particleData);
    }
  }

  private getInactiveParticle(cylinderIndex: number): ParticleData | null {
    // Find an inactive particle for the specific cylinder
    for (const particle of this.particlePool) {
      if (!particle.active && particle.cylinderIndex === cylinderIndex) {
        return particle;
      }
    }
    return null;
  }

  private emitParticle(cylinderIndex: number, intensity: number): void {
    const particle = this.getInactiveParticle(cylinderIndex);
    if (!particle) return;
    
    const bar = this.spectrumBars[cylinderIndex];
    
    // Position at top of cylinder with slight random offset
    const topY = bar.position.y + (bar.scaling.y * 0.5);
    particle.mesh.position.set(
      bar.position.x + (Math.random() - 0.5) * 0.3, // Small random X offset
      topY,
      bar.position.z + (Math.random() - 0.5) * 0.3  // Small random Z offset
    );
    
    // Set upward velocity with slight randomness
    particle.velocity.set(
      (Math.random() - 0.5) * 0.5, // Slight horizontal drift
      1.0 + Math.random() * 0.5,   // Upward velocity
      (Math.random() - 0.5) * 0.5  // Slight horizontal drift
    );
    
    // Reset particle properties
    particle.life = particle.maxLife;
    particle.active = true;
    particle.mesh.setEnabled(true);
    
    // Set initial scale and alpha
    particle.mesh.scaling.setAll(1.0);
    if (particle.mesh.material instanceof PBRMaterial) {
      particle.mesh.material.alpha = 0.8;
    }
  }

  private updateParticles(deltaTime: number): void {
    for (const particle of this.particlePool) {
      if (!particle.active) continue;
      
      // Update lifetime
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        // Particle died
        particle.active = false;
        particle.mesh.setEnabled(false);
        continue;
      }
      
      // Update position
      particle.mesh.position.addInPlace(particle.velocity.scale(deltaTime));
      
      // Apply slight gravity and air resistance
      particle.velocity.y -= 0.2 * deltaTime; // Slight downward acceleration
      particle.velocity.scaleInPlace(0.98); // Air resistance
      
      // Fade out over time
      const lifeRatio = particle.life / particle.maxLife;
      const alpha = Math.min(0.8, lifeRatio * 1.2); // Fade out in last 2/3 of life
      const scale = 0.5 + (lifeRatio * 0.5); // Shrink over time
      
      particle.mesh.scaling.setAll(scale);
      if (particle.mesh.material instanceof PBRMaterial) {
        particle.mesh.material.alpha = alpha;
        
        // Adjust emissive intensity based on life
        const emissiveIntensity = lifeRatio * 1.2;
        const baseColor = particle.mesh.material.baseColor;
        particle.mesh.material.emissiveColor = new Color3(
          (baseColor.r / 0.3) * emissiveIntensity,
          (baseColor.g / 0.3) * emissiveIntensity,
          (baseColor.b / 0.3) * emissiveIntensity
        );
      }
    }
  }

  private updateParticleEmission(deltaTime: number): void {
    for (let i = 0; i < this.config.bandCount; i++) {
      const intensity = this.smoothedData[i];
      
      // Update emission timer
      this.particleEmissionTimers[i] -= deltaTime;
      
      // Base emission rate (continuous small amounts)
      const baseEmissionRate = 0.3; // Emit every 0.3 seconds at minimum
      
      // Intensity-based emission rate (more frequent with higher intensity)
      const intensityEmissionRate = Math.max(0.05, 0.3 - (intensity * 0.25)); // Faster emission with higher intensity
      
      const emissionRate = Math.min(baseEmissionRate, intensityEmissionRate);
      
      if (this.particleEmissionTimers[i] <= 0) {
        // Emit particle
        this.emitParticle(i, intensity);
        
        // Reset timer
        this.particleEmissionTimers[i] = emissionRate;
        
        // Small chance for burst emission when intensity is high
        if (intensity > 0.7 && Math.random() < 0.3) {
          // Emit 1-2 additional particles for burst effect
          const burstCount = Math.floor(Math.random() * 2) + 1;
          for (let burst = 0; burst < burstCount; burst++) {
            setTimeout(() => this.emitParticle(i, intensity), burst * 50); // Stagger burst particles
          }
        }
      }
    }
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
    let lastTime = performance.now();
    
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      if (!this.analyser || !this.frequencyData) return;
      
      // Get frequency data
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      // Process frequency bands
      this.processFrequencyBands();
      
      // Update visual elements
      this.updateSpectrumBars();
      
      // Update particle system
      this.updateParticles(deltaTime);
      this.updateParticleEmission(deltaTime);
      
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
      
      // Subtle rotation for visual interest
      bar.rotation.y += 0.005 * (1 + intensity);
    }
  }

  private createFallbackAnimation(): void {
    // Create a gentle sine wave animation as fallback
    let time = 0;
    let lastTime = performance.now();
    
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
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
        
        bar.rotation.y += 0.002;
      }
      
      // Update particle system for fallback too
      this.updateParticles(deltaTime);
      this.updateParticleEmission(deltaTime);
      
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
    
    // Dispose particle system
    this.particlePool.forEach(particle => {
      particle.mesh.dispose();
      if (particle.mesh.material) {
        particle.mesh.material.dispose();
      }
    });
    
    this.spectrumBars = [];
    this.materials = [];
    this.spectrumLights = [];
    this.particlePool = [];
    
    console.log('Audio spectrum disposed');
  }
}