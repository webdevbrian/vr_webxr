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
    RectAreaLight,
    SpotLight,
    PointLight,
    Animation,
    AnimationGroup
  } from '@babylonjs/core';
  import '@babylonjs/core/Meshes/meshBuilder';
  import '@babylonjs/core/Meshes/Builders/octahedronBuilder';
  import * as CANNON from 'cannon-es';
  import { VRSceneConfig, VRSessionData } from '../types/VRTypes';
  import { VR_FEATURES } from '../utils/VRUtils';
  
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
    private lightAnimations: AnimationGroup[] = [];
  
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
      this.createAtmosphericEnvironment();
      this.setupBeautifulLighting();
      this.setupVR();
    }
  
    private setupScene(config: VRSceneConfig): void {
      // Create camera with better positioning for the dim scene
      this.camera = new ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 2.5,
        15,
        Vector3.Zero(),
        this.scene
      );
      this.camera.attachControl(this.canvas, true);
      this.camera.setTarget(Vector3.Zero());
  
      // Enable physics if requested
      if (config.enablePhysics) {
        this.scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin(true, 10, CANNON));
      }
  
      // Set ambient color to very dark for atmospheric effect
      this.scene.ambientColor = new Color3(0.05, 0.05, 0.1);
      
      // Create atmospheric fog
      this.scene.fogMode = Scene.FOGMODE_EXP2;
      this.scene.fogColor = new Color3(0.1, 0.1, 0.2);
      this.scene.fogDensity = 0.02;
    }
  
    private createAtmosphericEnvironment(): void {
      // Create a larger, darker ground
      const ground = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, this.scene);
      const groundMaterial = new PBRMaterial("groundMaterial", this.scene);
      groundMaterial.baseColor = new Color3(0.1, 0.1, 0.15);
      groundMaterial.roughness = 0.9;
      groundMaterial.metallicFactor = 0.1;
      groundMaterial.emissiveColor = new Color3(0.02, 0.02, 0.05);
      ground.material = groundMaterial;
      ground.receiveShadows = true;
  
      // Create atmospheric objects
      this.createAtmosphericObjects();
      this.createLightPanels();
      this.createFloatingElements();
    }
  
    private createAtmosphericObjects(): void {
      // Create mysterious monoliths
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI * 2) / 4;
        const radius = 12;
        
        const monolith = MeshBuilder.CreateBox(`monolith${i}`, { 
          width: 2, 
          height: 8, 
          depth: 0.5 
        }, this.scene);
        
        monolith.position.x = Math.cos(angle) * radius;
        monolith.position.z = Math.sin(angle) * radius;
        monolith.position.y = 4;
        
        const monolithMaterial = new PBRMaterial(`monolithMaterial${i}`, this.scene);
        monolithMaterial.baseColor = new Color3(0.05, 0.05, 0.1);
        monolithMaterial.roughness = 0.3;
        monolithMaterial.metallicFactor = 0.8;
        monolithMaterial.emissiveColor = new Color3(0.1, 0.05, 0.2);
        monolith.material = monolithMaterial;
      }
  
      // Create central crystal structure
      const crystal = MeshBuilder.CreateOctahedron("crystal", { size: 3 }, this.scene);
      crystal.position.y = 2;
      
      const crystalMaterial = new PBRMaterial("crystalMaterial", this.scene);
      crystalMaterial.baseColor = new Color3(0.2, 0.1, 0.4);
      crystalMaterial.roughness = 0.1;
      crystalMaterial.metallicFactor = 0.9;
      crystalMaterial.emissiveColor = new Color3(0.3, 0.1, 0.6);
      crystal.material = crystalMaterial;
      
      // Animate crystal rotation
      const crystalAnimation = Animation.CreateAndStartAnimation(
        "crystalRotation",
        crystal,
        "rotation.y",
        30,
        120,
        0,
        Math.PI * 2,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );
    }
  
    private createLightPanels(): void {
      // Create rectangular light panels using rectangular area lights
      const panelPositions = [
        { x: -8, y: 6, z: 0, rotY: 0 },
        { x: 8, y: 6, z: 0, rotY: Math.PI },
        { x: 0, y: 6, z: -8, rotY: Math.PI / 2 },
        { x: 0, y: 6, z: 8, rotY: -Math.PI / 2 }
      ];
  
      panelPositions.forEach((pos, index) => {
        // Create the physical panel
        const panel = MeshBuilder.CreatePlane(`lightPanel${index}`, { 
          width: 4, 
          height: 2 
        }, this.scene);
        
        panel.position.set(pos.x, pos.y, pos.z);
        panel.rotation.y = pos.rotY;
        
        const panelMaterial = new PBRMaterial(`panelMaterial${index}`, this.scene);
        panelMaterial.baseColor = new Color3(0.1, 0.1, 0.1);
        panelMaterial.emissiveColor = new Color3(0.8, 0.4, 0.2);
        panelMaterial.roughness = 0.1;
        panel.material = panelMaterial;
        
        // Create rectangular area light
        const rectLight = new RectAreaLight(
          `rectLight${index}`,
          new Color3(1, 0.6, 0.3),
          2, // intensity
          4, // width
          2  // height
        );
        
        rectLight.position.set(pos.x, pos.y, pos.z);
        rectLight.rotation.y = pos.rotY;
        rectLight.lookAt(Vector3.Zero());
        
        this.scene.addLight(rectLight);
        
        // Add subtle animation to light intensity
        const lightAnimation = Animation.CreateAndStartAnimation(
          `lightIntensity${index}`,
          rectLight,
          "intensity",
          30,
          90,
          2,
          3,
          Animation.ANIMATIONLOOPMODE_YOYO
        );
      });
    }
  
    private createFloatingElements(): void {
      // Create floating orbs with point lights
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const radius = 6 + Math.random() * 4;
        const height = 3 + Math.random() * 4;
        
        const orb = MeshBuilder.CreateSphere(`orb${i}`, { diameter: 0.5 }, this.scene);
        orb.position.x = Math.cos(angle) * radius;
        orb.position.z = Math.sin(angle) * radius;
        orb.position.y = height;
        
        const orbMaterial = new PBRMaterial(`orbMaterial${i}`, this.scene);
        orbMaterial.baseColor = new Color3(0.1, 0.1, 0.1);
        orbMaterial.emissiveColor = new Color3(0.4, 0.8, 1.0);
        orbMaterial.roughness = 0.1;
        orb.material = orbMaterial;
        
        // Add point light to each orb
        const orbLight = new PointLight(`orbLight${i}`, orb.position, this.scene);
        orbLight.diffuse = new Color3(0.4, 0.8, 1.0);
        orbLight.intensity = 0.5;
        orbLight.range = 8;
        
        // Animate orb floating
        const floatAnimation = Animation.CreateAndStartAnimation(
          `orbFloat${i}`,
          orb,
          "position.y",
          30,
          60 + i * 10,
          height,
          height + 1,
          Animation.ANIMATIONLOOPMODE_YOYO
        );
        
        // Animate light intensity
        const orbLightAnimation = Animation.CreateAndStartAnimation(
          `orbLightIntensity${i}`,
          orbLight,
          "intensity",
          30,
          45 + i * 5,
          0.3,
          0.8,
          Animation.ANIMATIONLOOPMODE_YOYO
        );
      }
    }
  
    private setupBeautifulLighting(): void {
      // Very dim ambient light for base illumination
      const hemisphericLight = new HemisphericLight(
        "hemisphericLight",
        new Vector3(0, 1, 0),
        this.scene
      );
      hemisphericLight.intensity = 0.1;
      hemisphericLight.diffuse = new Color3(0.2, 0.2, 0.4);
      hemisphericLight.specular = new Color3(0.1, 0.1, 0.2);
  
      // Main atmospheric spotlight from above
      const mainSpotlight = new SpotLight(
        "mainSpotlight",
        new Vector3(0, 15, 0),
        new Vector3(0, -1, 0),
        Math.PI / 3,
        2,
        this.scene
      );
      mainSpotlight.diffuse = new Color3(0.6, 0.4, 0.8);
      mainSpotlight.intensity = 1.5;
      mainSpotlight.range = 25;
      
      // Create shadow generator for main light
      const shadowGenerator = new ShadowGenerator(2048, mainSpotlight);
      shadowGenerator.useExponentialShadowMap = true;
      shadowGenerator.darkness = 0.7;
      
      // Add shadow casters
      this.scene.meshes.forEach(mesh => {
        if (mesh.name.includes('monolith') || mesh.name.includes('crystal') || mesh.name.includes('orb')) {
          shadowGenerator.addShadowCaster(mesh);
        }
      });
  
      // Rim lighting spots for dramatic effect
      const rimLights = [
        { pos: new Vector3(-15, 8, -15), color: new Color3(1, 0.3, 0.3) },
        { pos: new Vector3(15, 8, -15), color: new Color3(0.3, 1, 0.3) },
        { pos: new Vector3(-15, 8, 15), color: new Color3(0.3, 0.3, 1) },
        { pos: new Vector3(15, 8, 15), color: new Color3(1, 1, 0.3) }
      ];
  
      rimLights.forEach((lightData, index) => {
        const rimLight = new SpotLight(
          `rimLight${index}`,
          lightData.pos,
          Vector3.Zero().subtract(lightData.pos).normalize(),
          Math.PI / 4,
          2,
          this.scene
        );
        rimLight.diffuse = lightData.color;
        rimLight.intensity = 0.8;
        rimLight.range = 20;
        
        // Animate rim light intensity
        const rimAnimation = Animation.CreateAndStartAnimation(
          `rimLightIntensity${index}`,
          rimLight,
          "intensity",
          30,
          120 + index * 30,
          0.3,
          1.2,
          Animation.ANIMATIONLOOPMODE_YOYO
        );
      });
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
      this.engine.runRenderLoop(() => {
        this.scene.render();
      });
    }
  
    public resize(): void {
      this.engine.resize();
    }
  
    public dispose(): void {
      this.stopHeadTracking();
      
      // Stop all animations
      this.lightAnimations.forEach(animation => {
        animation.stop();
        animation.dispose();
      });
      
      this.scene.dispose();
      this.engine.dispose();
    }
  }