import {
    Engine,
    Scene,
    ArcRotateCamera,
    HemisphericLight,
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3,
    CubeTexture,
    Texture,
    PBRMaterial,
    DirectionalLight,
    ShadowGenerator,
    WebXRDefaultExperience,
    WebXRState,
    GroundMesh,
    Mesh,
    CannonJSPlugin,
    PointLight,
    SpotLight,
    ReflectionProbe,
    MirrorTexture,
    Plane,
    Constants,
    PostProcess,
    Effect,
    SSAORenderingPipeline,
    DefaultRenderingPipeline,
    PhysicsImpostor
  } from '@babylonjs/core';
  import * as CANNON from 'cannon-es';
  import { VRSceneConfig, VRSessionData } from '../types/VRTypes';
  import { VR_FEATURES } from '../utils/VRUtils';
  import { AudioSpectrum } from './AudioSpectrum';
  
  interface PerformanceStats {
    fps: number;
    drawCalls: number;
    vertices: number;
  }
  
  export class VRSceneManager {
    private engine: Engine;
    private scene: Scene;
    private camera: ArcRotateCamera;
    private xrHelper: WebXRDefaultExperience | null = null;
    private vrSessionData: VRSessionData;
    private canvas: HTMLCanvasElement;
    private audioSpectrum: AudioSpectrum | null = null;
    private spectrumLights: PointLight[] = [];
    private reflectionProbe: ReflectionProbe | null = null;
    private renderPipeline: DefaultRenderingPipeline | null = null;
  
    constructor(canvas: HTMLCanvasElement, config: VRSceneConfig) {
      this.canvas = canvas;
      this.engine = new Engine(canvas, true);
      this.scene = new Scene(this.engine);
      
      this.vrSessionData = {
        isActive: false,
        isSupported: false,
        controllers: [],
        headPosition: { x: 0, y: 0, z: 0 },
        headRotation: { x: 0, y: 0, z: 0 }
      };
  
      this.setupScene(config);
      this.createCyberpunkEnvironment();
      this.setupDramaticLighting();
      this.createAdditionalTexturedObjects();
      this.setupPostProcessing();
      this.setupAudioSpectrum();
      this.setupVR();
    }
  
    private setupScene(config: VRSceneConfig): void {
      // Create camera
      this.camera = new ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 2.5,
        10,
        Vector3.Zero(),
        this.scene
      );
      this.camera.attachControl(this.canvas, true);
  
      // Enable physics if requested
      if (config.enablePhysics) {
        this.scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin(true, 10, CANNON));
      }

      // Create dark cyberpunk skybox
      this.createCyberpunkSkybox();
    }
  
    private createCyberpunkSkybox(): void {
      const skybox = MeshBuilder.CreateSphere("skyBox", { diameter: 100 }, this.scene);
      const skyboxMaterial = new PBRMaterial("skyboxMaterial", this.scene);
      
      // Load sunset background texture
      const sunsetTexture = new Texture("https://images.pexels.com/photos/158163/clouds-cloudporn-weather-lookup-158163.jpeg?auto=compress&cs=tinysrgb&w=1024", this.scene);
      sunsetTexture.uOffset = 0;
      sunsetTexture.vOffset = 0;
      sunsetTexture.wrapU = Constants.TEXTURE_MIRROR_ADDRESSMODE;
      sunsetTexture.wrapV = Constants.TEXTURE_MIRROR_ADDRESSMODE;
      
      skyboxMaterial.backFaceCulling = false;
      skyboxMaterial.albedoTexture = sunsetTexture;
      skyboxMaterial.baseColor = new Color3(1, 1, 1); // Pure white to show texture clearly
      skyboxMaterial.roughness = 1.0;
      skyboxMaterial.metallicFactor = 0.0;
      skyboxMaterial.emissiveColor = new Color3(0, 0, 0); // No emissive to show texture
      skybox.material = skyboxMaterial;
      skybox.infiniteDistance = true;
    }

    private createCyberpunkEnvironment(): void {
      // Create wet street ground with reflections
      this.createWetStreetGround();
  
      // Create cyberpunk objects
      this.createCyberpunkObjects();
      this.createCyberpunkStructures();
      this.setupReflections();
    }
  
    private createWetStreetGround(): void {
      const ground = MeshBuilder.CreateGround("ground", { width: 30, height: 30 }, this.scene);
      const groundMaterial = new PBRMaterial("groundMaterial", this.scene);
      
      // Load wet asphalt texture
      const asphaltTexture = new Texture("https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
      asphaltTexture.uOffset = 0;
      asphaltTexture.vOffset = 0;
      asphaltTexture.uScale = 4;
      asphaltTexture.vScale = 4;
      
      groundMaterial.albedoTexture = asphaltTexture;
      groundMaterial.baseColor = new Color3(1, 1, 1); // Pure white to show texture clearly
      groundMaterial.roughness = 0.2; // Smooth for wet look but not mirror-like
      groundMaterial.metallicFactor = 0.7; // High metallic for wet reflection
      groundMaterial.emissiveColor = new Color3(0, 0, 0); // No emissive to show texture
      
      ground.material = groundMaterial;
      ground.receiveShadows = true;
    }

    private createCyberpunkObjects(): void {
      // Create neon-lit geometric structures
      const colors = [
        new Color3(0, 1, 1),     // Cyan
        new Color3(1, 0, 1),     // Magenta
        new Color3(0, 0.5, 1),   // Electric blue
        new Color3(1, 0.2, 0.8), // Hot pink
        new Color3(0.5, 0, 1)    // Purple
      ];

      for (let i = 0; i < 5; i++) {
        // Create hexagonal prisms instead of cubes
        const hex = MeshBuilder.CreateCylinder(`hex${i}`, { 
          height: 2 + Math.random() * 2, 
          diameter: 1.5,
          tessellation: 6 
        }, this.scene);
        
        hex.position.x = (i - 2) * 4;
        hex.position.y = (2 + Math.random() * 2) / 2;
        hex.position.z = -2;
  
        const material = new PBRMaterial(`hexMaterial${i}`, this.scene);
        
        // Load metal texture for hexagonal objects
        const metalTexture = new Texture("https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
        metalTexture.uScale = 2;
        metalTexture.vScale = 2;
        
        const color = colors[i];
        
        material.baseTexture = metalTexture;
        material.baseColor = new Color3(1, 1, 1); // Pure white base to show texture
        material.roughness = 0.3; // Slightly rougher for realistic metal
        material.metallicFactor = 0.9;
        material.emissiveColor = new Color3(color.r * 0.2, color.g * 0.2, color.b * 0.2); // Minimal emissive
        hex.material = material;
        
        // Add physics imposter for collision
        hex.physicsImpostor = new PhysicsImpostor(hex, PhysicsImpostor.CylinderImpostor, { mass: 0, restitution: 0.3 }, this.scene);
      }
  
      // Create a central holographic sphere
      const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 3 }, this.scene);
      sphere.position.set(0, 1.5, 3);
      
      const sphereMaterial = new PBRMaterial("sphereMaterial", this.scene);
      
      // Load glass/crystal texture for holographic sphere
      const glassTexture = new Texture("https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
      
      sphereMaterial.albedoTexture = glassTexture;
      sphereMaterial.baseColor = new Color3(1, 1, 1); // Pure white to show texture
      sphereMaterial.roughness = 0.05; // Very smooth for glass-like appearance
      sphereMaterial.metallicFactor = 0.9;
      sphereMaterial.emissiveColor = new Color3(0, 0.4, 0.6); // Minimal cyan glow
      sphereMaterial.alpha = 0.8; // Semi-transparent for holographic effect
      sphere.material = sphereMaterial;
      
      // Add physics imposter for collision
      sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, { mass: 0, restitution: 0.5 }, this.scene);
  
      // Create floating neon rings
      const ring = MeshBuilder.CreateTorus("ring", { 
        diameter: 4, 
        thickness: 0.3 
      }, this.scene);
      ring.position.set(-6, 3, 0);
      ring.rotation.x = Math.PI / 3;
      
      const ringMaterial = new PBRMaterial("ringMaterial", this.scene);
      
      // Load neon/plastic texture for ring
      const neonTexture = new Texture("https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
      neonTexture.uScale = 3;
      neonTexture.vScale = 1;
      
      ringMaterial.albedoTexture = neonTexture;
      ringMaterial.baseColor = new Color3(1, 1, 1); // Pure white to show texture
      ringMaterial.roughness = 0.2; // Slightly rougher for realistic neon material
      ringMaterial.metallicFactor = 0.9;
      ring.material = ringMaterial;
      
      // Add physics imposter for collision
      ring.physicsImpostor = new PhysicsImpostor(ring, PhysicsImpostor.TorusImpostor, { mass: 0, restitution: 0.4 }, this.scene);
    }
  
    private createCyberpunkStructures(): void {
      // Create neon-lit platforms in a circular arrangement
      for (let i = 0; i < 4; i++) {
        const platform = MeshBuilder.CreateCylinder(`platform${i}`, {
          height: 0.3,
          diameter: 2.5,
          tessellation: 8
        }, this.scene);
        
        platform.position.set(
          Math.cos(i * Math.PI * 2 / 4) * 10,
          0.15,
          Math.sin(i * Math.PI * 2 / 4) * 10
        );
  
        const platformMaterial = new PBRMaterial(`platformMaterial${i}`, this.scene);
        
        // Load concrete texture for platforms
        const concreteTexture = new Texture("https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
        concreteTexture.uScale = 2;
        concreteTexture.vScale = 2;
        
        platformMaterial.albedoTexture = concreteTexture;
        platformMaterial.baseColor = new Color3(1, 1, 1); // Pure white to show texture
        platformMaterial.roughness = 0.4; // Rougher for concrete appearance
        platformMaterial.metallicFactor = 0.8;
        platform.material = platformMaterial;
      }
  
      // Create towering neon pillars
      for (let i = 0; i < 3; i++) {
        const pillar = MeshBuilder.CreateCylinder(`pillar${i}`, {
          height: 8 + i * 2,
          diameter: 0.6,
          tessellation: 8
        }, this.scene);
        
        pillar.position.set(
          (i - 1) * 6,
          (8 + i * 2) / 2,
          -8
        );
        
        const pillarMaterial = new PBRMaterial(`pillarMaterial${i}`, this.scene);
        
        // Load brushed metal texture for pillars
        const brushedMetalTexture = new Texture("https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
        brushedMetalTexture.uScale = 1;
        brushedMetalTexture.vScale = 4; // Stretch vertically for pillar effect
        
        pillarMaterial.albedoTexture = brushedMetalTexture;
        pillarMaterial.baseColor = new Color3(1, 1, 1); // Pure white to show texture
        pillarMaterial.roughness = 0.4; // Rougher for brushed metal appearance
        pillarMaterial.metallicFactor = 0.7;
        
        const colors = [
          new Color3(1, 0, 0.5), // Hot pink
          new Color3(0, 1, 0.5), // Cyan
          new Color3(0.5, 0, 1)  // Purple
        ];
        pillarMaterial.emissiveColor = colors[i].scale(0.2); // Reduced for texture visibility
        pillar.material = pillarMaterial;
      }
    }

    private setupReflections(): void {
      // Create reflection probe for real-time reflections
      this.reflectionProbe = new ReflectionProbe("reflectionProbe", 512, this.scene);
      this.reflectionProbe.setRenderingAutoClearDepthStencil(1, true, true, true);
      
      // Apply reflections to all PBR materials
      this.scene.materials.forEach(material => {
        if (material instanceof PBRMaterial) {
          material.reflectionTexture = this.reflectionProbe.cubeTexture;
          material.reflectionFresnelParameters = {
            bias: 0.1,
            power: 0.5,
            leftColor: Color3.White(),
            rightColor: Color3.Black()
          };
        }
      });
    }

    private setupAudioSpectrum(): void {
      // Create audio spectrum visualization
      this.audioSpectrum = new AudioSpectrum(this.scene, {
        bandCount: 12,
        radius: 15, // Position outside main scene objects
        maxHeight: 6, // Maximum bar height
        smoothingFactor: 0.8 // Smooth animation
      });
      
      // Get spectrum lights for audio-reactive lighting
      if (this.audioSpectrum) {
        this.spectrumLights = this.audioSpectrum.getSpectrumLights();
      }
    }
  
    private setupDramaticLighting(): void {
      // Extremely dim ambient light for dramatic contrast
      const hemisphericLight = new HemisphericLight(
        "hemisphericLight",
        new Vector3(0, 1, 0),
        this.scene
      );
      hemisphericLight.intensity = 0.02; // Extremely dark for dramatic effect
      hemisphericLight.diffuse = new Color3(0.2, 0.3, 0.6); // Cool blue ambient
  
      // Strong directional light for dramatic shadows
      const directionalLight = new DirectionalLight(
        "directionalLight",
        new Vector3(-0.3, -1, -0.7), // More angled for dramatic shadows
        this.scene
      );
      directionalLight.intensity = 1.8; // Even stronger for more bloom
      directionalLight.position = new Vector3(8, 15, 8);
      directionalLight.diffuse = new Color3(1.0, 0.9, 0.7); // Warm directional light
      
      // Add secondary directional light for cross-lighting
      const directionalLight2 = new DirectionalLight(
        "directionalLight2",
        new Vector3(0.5, -1, 0.3),
        this.scene
      );
      directionalLight2.intensity = 1.0;
      directionalLight2.position = new Vector3(-10, 12, -5);
      directionalLight2.diffuse = new Color3(0.6, 0.8, 1.0); // Cool blue directional light
      
      // Add third directional light for rim lighting
      const directionalLight3 = new DirectionalLight(
        "directionalLight3",
        new Vector3(0.8, -0.5, -0.2),
        this.scene
      );
      directionalLight3.intensity = 0.8;
      directionalLight3.position = new Vector3(12, 8, 10);
      directionalLight3.diffuse = new Color3(1.0, 0.4, 0.8); // Pink rim light
  
      // High-quality shadow generator for dramatic shadows
      const shadowGenerator = new ShadowGenerator(2048, directionalLight); // Higher resolution
      shadowGenerator.usePercentageCloserFiltering = true; // Softer shadow edges
      shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
      shadowGenerator.darkness = 0.8; // Darker shadows
      shadowGenerator.bias = 0.00001; // Reduce shadow acne
      
      // Add key objects as shadow casters
      this.scene.meshes.forEach(mesh => {
        if (mesh.name.includes('hex') || mesh.name.includes('sphere') || 
            mesh.name.includes('ring') || mesh.name.includes('pillar') ||
            mesh.name.includes('wall') || mesh.name.includes('crate')) {
          shadowGenerator.addShadowCaster(mesh);
        }
      });
      
      // Add dramatic atmospheric lighting
      this.createDramaticAtmosphericLights();
      this.createVolumetricLighting();
    }
  
    private createDramaticAtmosphericLights(): void {
      // Dramatic key light (main light source)
      const keyLight = new SpotLight(
        "keyLight",
        new Vector3(-12, 12, -8),
        new Vector3(1, -1, 1),
        Math.PI / 4, // Narrower cone for more focused light
        4, // Sharper falloff
        this.scene
      );
      keyLight.diffuse = new Color3(1.0, 0.8, 0.6); // Warm key light
      keyLight.intensity = 4.5; // Much brighter for stronger bloom
      keyLight.range = 25;
      
      // Rim light for silhouette enhancement
      const rimLight = new SpotLight(
        "rimLight",
        new Vector3(15, 8, 10),
        new Vector3(-1, -0.5, -1),
        Math.PI / 6, // Very narrow cone
        6, // Sharp falloff
        this.scene
      );
      rimLight.diffuse = new Color3(0.3, 0.7, 1.0); // Cool rim light
      rimLight.intensity = 3.8; // Brighter for more bloom
      rimLight.range = 20;
      
      // Fill light (subtle, opposite side)
      const fillLight = new SpotLight(
        "fillLight",
        new Vector3(8, 6, -12),
        new Vector3(-0.5, -1, 1),
        Math.PI / 3,
        3,
        this.scene
      );
      fillLight.diffuse = new Color3(0.4, 0.5, 0.8); // Cool fill light
      fillLight.intensity = 1.2; // Brighter for more overall illumination
      fillLight.range = 18;
      
      // Add additional directional spot lights for dramatic effect
      const dramaticSpot1 = new SpotLight(
        "dramaticSpot1",
        new Vector3(-20, 15, 0),
        new Vector3(1, -0.8, 0),
        Math.PI / 5,
        5,
        this.scene
      );
      dramaticSpot1.diffuse = new Color3(1.0, 0.3, 0.1); // Orange dramatic light
      dramaticSpot1.intensity = 5.0; // Very bright for strong bloom
      dramaticSpot1.range = 30;
      
      const dramaticSpot2 = new SpotLight(
        "dramaticSpot2",
        new Vector3(20, 15, 0),
        new Vector3(-1, -0.8, 0),
        Math.PI / 5,
        5,
        this.scene
      );
      dramaticSpot2.diffuse = new Color3(0.1, 0.3, 1.0); // Blue dramatic light
      dramaticSpot2.intensity = 5.0; // Very bright for strong bloom
      dramaticSpot2.range = 30;
      
      // Accent lights for specific objects
      this.createAccentLights();
    }
    
    private createAccentLights(): void {
      // Accent light for the central sphere
      const spotLight1 = new SpotLight(
        "sphereAccent",
        new Vector3(0, 8, 8),
        new Vector3(0, -1, -0.5),
        Math.PI / 8, // Very focused
        8, // Sharp falloff
        this.scene
      );
      spotLight1.diffuse = new Color3(0, 1, 1); // Cyan to match sphere
      spotLight1.intensity = 6.0; // Much brighter for bloom
      spotLight1.range = 15;
      
      // Accent light for the ring
      const spotLight2 = new SpotLight(
        "ringAccent",
        new Vector3(-6, 8, 5),
        new Vector3(0, -1, -1),
        Math.PI / 6,
        6,
        this.scene
      );
      spotLight2.diffuse = new Color3(1, 0, 1); // Magenta to match ring
      spotLight2.intensity = 5.5; // Much brighter for bloom
      spotLight2.range = 12;
      
      // Ground uplighting for dramatic effect
      for (let i = 0; i < 4; i++) {
        // Add more intense uplights for bloom
        const intenseUpLight = new PointLight(
          `intenseUpLight${i}`,
          new Vector3(
            Math.cos(i * Math.PI / 2) * 6,
            1.0,
            Math.sin(i * Math.PI / 2) * 6
          ),
          this.scene
        );
        intenseUpLight.diffuse = new Color3(0.8, 0.2, 1.0); // Bright purple
        intenseUpLight.intensity = 4.0; // Very bright for bloom
        intenseUpLight.range = 15;
        
        const upLight = new PointLight(
          `upLight${i}`,
          new Vector3(
            Math.cos(i * Math.PI / 2) * 8,
            0.5, // Close to ground
            Math.sin(i * Math.PI / 2) * 8
          ),
          this.scene
        );
        upLight.diffuse = new Color3(0.2, 0.4, 1.0); // Cool blue uplight
        upLight.intensity = 2.5; // Brighter for more bloom
        upLight.range = 12;
      }
      
      // Add high-intensity accent lights for maximum bloom
      const bloomLight1 = new PointLight(
        "bloomLight1",
        new Vector3(0, 5, 0), // Center high light
        this.scene
      );
      bloomLight1.diffuse = new Color3(1.0, 1.0, 0.8); // Bright white-yellow
      bloomLight1.intensity = 8.0; // Extremely bright for maximum bloom
      bloomLight1.range = 20;
      
      const bloomLight2 = new PointLight(
        "bloomLight2",
        new Vector3(-6, 4, 0), // Ring area
        this.scene
      );
      bloomLight2.diffuse = new Color3(1.0, 0.2, 1.0); // Bright magenta
      bloomLight2.intensity = 7.0; // Very bright for bloom
      bloomLight2.range = 18;
    }
    
    private createVolumetricLighting(): void {
      // Create volumetric fog for atmospheric effect
      this.scene.fogMode = Scene.FOGMODE_EXP2;
      this.scene.fogDensity = 0.02; // Subtle fog
      this.scene.fogColor = new Color3(0.1, 0.15, 0.3); // Dark blue fog
    }
    
    private setupPostProcessing(): void {
      // Create default rendering pipeline with advanced effects
      this.renderPipeline = new DefaultRenderingPipeline(
        "defaultPipeline",
        true, // HDR enabled
        this.scene,
        [this.camera]
      );
      
      // Enable and configure SSAO (Screen Space Ambient Occlusion)
      this.renderPipeline.samples = 4; // Anti-aliasing
      
      // SSAO Configuration for dramatic ambient occlusion
      if (this.renderPipeline.ssaoRenderingPipeline) {
        this.renderPipeline.ssaoRenderingPipeline.fallOff = 0.000001;
        this.renderPipeline.ssaoRenderingPipeline.area = 1.0;
        this.renderPipeline.ssaoRenderingPipeline.radius = 0.5; // Tighter occlusion
        this.renderPipeline.ssaoRenderingPipeline.totalStrength = 2.0; // Stronger effect
        this.renderPipeline.ssaoRenderingPipeline.base = 0.1; // Darker base
      }
      
      // Enable bloom for dramatic lighting effects
      this.renderPipeline.bloomEnabled = true;
      this.renderPipeline.bloomThreshold = 0.6; // Lower threshold for more bloom
      this.renderPipeline.bloomWeight = 0.6; // Much stronger bloom intensity
      this.renderPipeline.bloomKernel = 128; // Larger kernel for more spread
      this.renderPipeline.bloomScale = 0.8; // Scale for bloom effect
      
      // Enable tone mapping for better contrast
      this.renderPipeline.toneMappingEnabled = true;
      this.renderPipeline.toneMappingType = 1; // ACES tone mapping
      
      // Enable image processing for enhanced visuals
      this.renderPipeline.imageProcessingEnabled = true;
      if (this.renderPipeline.imageProcessing) {
        this.renderPipeline.imageProcessing.contrast = 1.4; // Even higher contrast for bloom
        this.renderPipeline.imageProcessing.exposure = 1.3; // Brighter exposure for bloom
        this.renderPipeline.imageProcessing.vignetteEnabled = true;
        this.renderPipeline.imageProcessing.vignetteWeight = 0.3; // Subtle vignette
        this.renderPipeline.imageProcessing.vignetteColor = new Color3(0, 0, 0.1); // Dark blue vignette
      }
      
      // Enable depth of field for cinematic effect (subtle)
      this.renderPipeline.depthOfFieldEnabled = false; // Disable to prevent blur
    }
  
    private async setupVR(): Promise<void> {
      try {
        this.xrHelper = await this.scene.createDefaultXRExperienceAsync({
          floorMeshes: [this.scene.getMeshByName("ground") as GroundMesh],
          optionalFeatures: true
        });
  
        if (this.xrHelper) {
          this.vrSessionData.isSupported = true;
          
          // Set up VR state change handlers
          this.xrHelper.baseExperience.onStateChangedObservable.add((state) => {
            this.vrSessionData.isActive = state === WebXRState.IN_XR;
            
            if (state === WebXRState.IN_XR) {
              console.log('VR session started');
              this.startHeadTracking();
            } else if (state === WebXRState.NOT_IN_XR) {
              console.log('VR session ended');
              this.stopHeadTracking();
            }
          });
  
          // Enable teleportation
          const teleportationFeature = this.xrHelper.baseExperience.featuresManager.enableFeature(
            VR_FEATURES.TELEPORTATION,
            "stable",
            {
              xrInput: this.xrHelper.input,
              floorMeshes: [this.scene.getMeshByName("ground") as Mesh]
            }
          );
  
          // Enable pointer selection
          const pointerSelectionFeature = this.xrHelper.baseExperience.featuresManager.enableFeature(
            VR_FEATURES.POINTER_SELECTION,
            "stable",
            {
              xrInput: this.xrHelper.input,
              enablePointerSelectionOnAllControllers: true
            }
          );
  
          console.log('VR features enabled:', { teleportationFeature, pointerSelectionFeature });
        }
      } catch (error) {
        console.error('Failed to setup VR:', error);
        this.vrSessionData.isSupported = false;
      }
    }
  
    private headTrackingInterval: number | null = null;
  
    private startHeadTracking(): void {
      if (this.headTrackingInterval) {
        clearInterval(this.headTrackingInterval);
      }
  
      this.headTrackingInterval = setInterval(() => {
        if (this.xrHelper && this.xrHelper.baseExperience.camera) {
          const camera = this.xrHelper.baseExperience.camera;
          
          // Update head position
          this.vrSessionData.headPosition = {
            x: Math.round(camera.position.x * 100) / 100,
            y: Math.round(camera.position.y * 100) / 100,
            z: Math.round(camera.position.z * 100) / 100
          };
  
          // Update head rotation (convert from radians to degrees)
          this.vrSessionData.headRotation = {
            x: Math.round((camera.rotation.x * 180 / Math.PI) * 100) / 100,
            y: Math.round((camera.rotation.y * 180 / Math.PI) * 100) / 100,
            z: Math.round((camera.rotation.z * 180 / Math.PI) * 100) / 100
          };
  
          // Update controller data
          if (this.xrHelper.input && this.xrHelper.input.controllers) {
            this.vrSessionData.controllers = this.xrHelper.input.controllers.map((controller, index) => ({
              id: `controller_${index}`,
              position: {
                x: Math.round((controller.pointer?.position.x || 0) * 100) / 100,
                y: Math.round((controller.pointer?.position.y || 0) * 100) / 100,
                z: Math.round((controller.pointer?.position.z || 0) * 100) / 100
              },
              rotation: {
                x: Math.round(((controller.pointer?.rotation.x || 0) * 180 / Math.PI) * 100) / 100,
                y: Math.round(((controller.pointer?.rotation.y || 0) * 180 / Math.PI) * 100) / 100,
                z: Math.round(((controller.pointer?.rotation.z || 0) * 180 / Math.PI) * 100) / 100
              },
              connected: controller.inputSource.connected
            }));
          }
        }
      }, 50); // Update every 50ms for smooth tracking
    }
  
    private stopHeadTracking(): void {
      if (this.headTrackingInterval) {
        clearInterval(this.headTrackingInterval);
        this.headTrackingInterval = null;
      }
      
      // Reset tracking data
      this.vrSessionData.headPosition = { x: 0, y: 0, z: 0 };
      this.vrSessionData.headRotation = { x: 0, y: 0, z: 0 };
      this.vrSessionData.controllers = [];
    }
    public async enterVR(): Promise<boolean> {
      if (!this.xrHelper) {
        console.error('VR not initialized');
        return false;
      }
  
      try {
        await this.xrHelper.baseExperience.enterXRAsync(
          "immersive-vr",
          "local-floor"
        );
        return true;
      } catch (error) {
        console.error('Failed to enter VR:', error);
        return false;
      }
    }
  
    public async exitVR(): Promise<void> {
      if (this.xrHelper) {
        await this.xrHelper.baseExperience.exitXRAsync();
      }
    }
  
    public getVRSessionData(): VRSessionData {
      return { ...this.vrSessionData };
    }
  
    public getPerformanceStats(): PerformanceStats {
      const engine = this.engine;
      const scene = this.scene;
      
      return {
        fps: engine.getFps(),
        drawCalls: scene.getEngine().drawCalls,
        vertices: scene.getTotalVertices()
      };
    }
  
    public updateCameraFOV(fovDegrees: number): void {
      // Convert degrees to radians
      const fovRadians = (fovDegrees * Math.PI) / 180;
      
      // Update the arc rotate camera FOV
      if (this.camera) {
        this.camera.fov = fovRadians;
      }
      
      // Note: VR cameras typically control their own FOV based on the headset
      // This setting primarily affects desktop mode
    }
  
    public startRenderLoop(): void {
      // Ensure canvas is properly sized before starting render loop
      this.engine.resize();
      
      this.engine.runRenderLoop(() => {
        if (this.scene && this.scene.activeCamera) {
          this.scene.render();
        }
      });
    }
  
    public resize(): void {
      this.engine.resize();
    }
  
    public dispose(): void {
      this.stopHeadTracking();
      
      // Dispose post-processing pipeline
      if (this.renderPipeline) {
        this.renderPipeline.dispose();
        this.renderPipeline = null;
      }
      
      // Dispose audio spectrum
      if (this.audioSpectrum) {
        this.audioSpectrum.dispose();
        this.audioSpectrum = null;
      }
      
      this.scene.dispose();
      this.engine.dispose();
    }

  private createAdditionalTexturedObjects(): void {
    // Create textured wall panels
    for (let i = 0; i < 3; i++) {
      const wall = MeshBuilder.CreateBox(`wall${i}`, { 
        width: 4, 
        height: 6, 
        depth: 0.2 
      }, this.scene);
      
      wall.position.set(
        -15 + (i * 8),
        3,
        -12
      );
      
      const wallMaterial = new PBRMaterial(`wallMaterial${i}`, this.scene);
      
      // Load brick/concrete wall texture
      const wallTexture = new Texture("https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
      wallTexture.uScale = 2;
      wallTexture.vScale = 3;
      
      wallMaterial.albedoTexture = wallTexture;
      wallMaterial.baseColor = new Color3(0.8, 0.8, 0.9); // Slight blue tint
      wallMaterial.roughness = 0.8; // Rough concrete surface
      wallMaterial.metallicFactor = 0.1; // Non-metallic
      wall.material = wallMaterial;
    }
    
    // Create textured crates/boxes
    for (let i = 0; i < 4; i++) {
      const crate = MeshBuilder.CreateBox(`crate${i}`, { 
        width: 1.5, 
        height: 1.5, 
        depth: 1.5 
      }, this.scene);
      
      crate.position.set(
        -8 + (i * 4),
        0.75,
        5
      );
      
      const crateMaterial = new PBRMaterial(`crateMaterial${i}`, this.scene);
      
      // Load wood crate texture
      const crateTexture = new Texture("https://images.pexels.com/photos/129731/pexels-photo-129731.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
      crateTexture.uScale = 1;
      crateTexture.vScale = 1;
      
      crateMaterial.albedoTexture = crateTexture;
      crateMaterial.baseColor = new Color3(1, 1, 1);
      crateMaterial.roughness = 0.9; // Very rough wood surface
      crateMaterial.metallicFactor = 0.0; // Non-metallic wood
      crate.material = crateMaterial;
    }
    
    // Create textured floor tiles in different areas
    for (let i = 0; i < 6; i++) {
      const tile = MeshBuilder.CreateBox(`tile${i}`, { 
        width: 3, 
        height: 0.1, 
        depth: 3 
      }, this.scene);
      
      const angle = (i * Math.PI * 2) / 6;
      tile.position.set(
        Math.cos(angle) * 12,
        0.05,
        Math.sin(angle) * 12
      );
      
      const tileMaterial = new PBRMaterial(`tileMaterial${i}`, this.scene);
      
      // Load tile texture
      const tileTexture = new Texture("https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=512", this.scene);
      tileTexture.uScale = 2;
      tileTexture.vScale = 2;
      
      tileMaterial.albedoTexture = tileTexture;
      tileMaterial.baseColor = new Color3(0.9, 0.9, 1.0); // Slight blue tint
      tileMaterial.roughness = 0.3; // Smooth tiles
      tileMaterial.metallicFactor = 0.2; // Slightly reflective
      tile.material = tileMaterial;
    }
  }
}