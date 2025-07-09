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
    Constants
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
      this.setupCyberpunkLighting();
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
      
      skyboxMaterial.backFaceCulling = false;
      skyboxMaterial.baseColor = new Color3(0.05, 0.05, 0.1); // Very dark blue
      skyboxMaterial.roughness = 1.0;
      skyboxMaterial.metallicFactor = 0.0;
      skyboxMaterial.emissiveColor = new Color3(0.02, 0.02, 0.05); // Subtle dark glow
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
  
    private setupCyberpunkLighting(): void {
      // Very dim ambient light for dark atmosphere
      const hemisphericLight = new HemisphericLight(
        "hemisphericLight",
        new Vector3(0, 1, 0),
        this.scene
      );
      hemisphericLight.intensity = 0.1; // Much darker
  
      // Subtle directional light
      const directionalLight = new DirectionalLight(
        "directionalLight",
        new Vector3(-0.5, -1, -0.5),
        this.scene
      );
      directionalLight.intensity = 0.3; // Much dimmer
      directionalLight.position = new Vector3(5, 10, 5);
  
      // Shadow generator
      const shadowGenerator = new ShadowGenerator(1024, directionalLight);
      shadowGenerator.useExponentialShadowMap = true;
      
      // Add key objects as shadow casters
      this.scene.meshes.forEach(mesh => {
        if (mesh.name.includes('hex') || mesh.name.includes('sphere') || mesh.name.includes('ring') || mesh.name.includes('pillar')) {
          shadowGenerator.addShadowCaster(mesh);
        }
      });
      
      // Add atmospheric spot lights
      this.createAtmosphericLights();
    }
  
    private createAtmosphericLights(): void {
      // Create colored spot lights for atmosphere
      const spotLight1 = new SpotLight(
        "spotLight1",
        new Vector3(-10, 8, -5),
        new Vector3(1, -1, 1),
        Math.PI / 3,
        2,
        this.scene
      );
      spotLight1.diffuse = new Color3(0, 0.5, 1); // Blue
      spotLight1.intensity = 0.5;
      
      const spotLight2 = new SpotLight(
        "spotLight2",
        new Vector3(10, 8, 5),
        new Vector3(-1, -1, -1),
        Math.PI / 3,
        2,
        this.scene
      );
      spotLight2.diffuse = new Color3(1, 0, 0.5); // Pink
      spotLight2.intensity = 0.5;
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
      
      // Dispose audio spectrum
      if (this.audioSpectrum) {
        this.audioSpectrum.dispose();
        this.audioSpectrum = null;
      }
      
      this.scene.dispose();
      this.engine.dispose();
    }
  }