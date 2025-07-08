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
    CannonJSPlugin
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
      this.createEnvironment();
      this.setupLighting();
      this.setupAudioSpectrum();
      this.createSouthwestLogo();
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
  
      // Create skybox
      if (config.skyboxTexture) {
        this.createSkybox(config.skyboxTexture);
      }
    }
  
    private createEnvironment(): void {
      // Create ground
      const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, this.scene);
      const groundMaterial = new PBRMaterial("groundMaterial", this.scene);
      groundMaterial.baseColor = new Color3(0.2, 0.3, 0.2);
      groundMaterial.roughness = 0.8;
      groundMaterial.metallicFactor = 0.1;
      ground.material = groundMaterial;
      ground.receiveShadows = true;
  
      // Create some interesting objects
      this.createDemoObjects();
      this.createInteractiveElements();
    }
  
    private createDemoObjects(): void {
      // Create a series of cubes with different materials
      for (let i = 0; i < 5; i++) {
        const box = MeshBuilder.CreateBox(`box${i}`, { size: 1 }, this.scene);
        box.position.x = (i - 2) * 3;
        box.position.y = 0.5;
        box.position.z = 0;
  
        const material = new PBRMaterial(`boxMaterial${i}`, this.scene);
        material.baseColor = new Color3(
          Math.random(),
          Math.random(),
          Math.random()
        );
        material.roughness = Math.random();
        material.metallicFactor = Math.random();
        box.material = material;
      }
  
      // Create a sphere
      const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2 }, this.scene);
      sphere.position.set(0, 1, 5);
      
      const sphereMaterial = new PBRMaterial("sphereMaterial", this.scene);
      sphereMaterial.baseColor = new Color3(1, 0.5, 0);
      sphereMaterial.roughness = 0.2;
      sphereMaterial.metallicFactor = 0.8;
      sphere.material = sphereMaterial;
  
      // Create a torus
      const torus = MeshBuilder.CreateTorus("torus", { 
        diameter: 3, 
        thickness: 0.5 
      }, this.scene);
      torus.position.set(-5, 2, 0);
      torus.rotation.x = Math.PI / 4;
      
      const torusMaterial = new PBRMaterial("torusMaterial", this.scene);
      torusMaterial.baseColor = new Color3(0.5, 0, 1);
      torusMaterial.roughness = 0.1;
      torusMaterial.metallicFactor = 0.9;
      torus.material = torusMaterial;
    }
  
    private createInteractiveElements(): void {
      // Create floating platforms
      for (let i = 0; i < 3; i++) {
        const platform = MeshBuilder.CreateCylinder(`platform${i}`, {
          height: 0.2,
          diameter: 2
        }, this.scene);
        
        platform.position.set(
          Math.cos(i * Math.PI * 2 / 3) * 8,
          1 + i * 0.5,
          Math.sin(i * Math.PI * 2 / 3) * 8
        );
  
        const platformMaterial = new PBRMaterial(`platformMaterial${i}`, this.scene);
        platformMaterial.baseColor = new Color3(0.8, 0.8, 0.2);
        platformMaterial.roughness = 0.3;
        platformMaterial.metallicFactor = 0.1;
        platform.material = platformMaterial;
      }
  
      // Create a central pillar
      const pillar = MeshBuilder.CreateCylinder("pillar", {
        height: 6,
        diameter: 0.8
      }, this.scene);
      pillar.position.y = 3;
      
      const pillarMaterial = new PBRMaterial("pillarMaterial", this.scene);
      pillarMaterial.baseColor = new Color3(0.6, 0.6, 0.6);
      pillarMaterial.roughness = 0.4;
      pillarMaterial.metallicFactor = 0.6;
      pillar.material = pillarMaterial;
    }

    private createSouthwestLogo(): void {
      // Create Southwest Airlines logo using geometric shapes
      // Position it safely away from other elements at x: -15, y: 3, z: -5
      
      // Create the heart shape base (simplified as two spheres and a triangle)
      const heartLeft = MeshBuilder.CreateSphere("heartLeft", { diameter: 1.2 }, this.scene);
      heartLeft.position.set(-15.6, 3.3, -5);
      
      const heartRight = MeshBuilder.CreateSphere("heartRight", { diameter: 1.2 }, this.scene);
      heartRight.position.set(-14.4, 3.3, -5);
      
      // Create triangle for bottom of heart
      const heartBottom = MeshBuilder.CreateCylinder("heartBottom", {
        height: 0.2,
        diameterTop: 0,
        diameterBottom: 1.8,
        tessellation: 3
      }, this.scene);
      heartBottom.position.set(-15, 2.4, -5);
      heartBottom.rotation.z = Math.PI; // Flip triangle
      
      // Create Southwest text representation (simplified as boxes)
      const textBlocks = [];
      const letters = ['S', 'W', 'A']; // Simplified representation
      
      for (let i = 0; i < 3; i++) {
        const letterBlock = MeshBuilder.CreateBox(`letter_${letters[i]}`, {
          width: 0.4,
          height: 0.6,
          depth: 0.1
        }, this.scene);
        letterBlock.position.set(-16 + (i * 0.7), 1.5, -5);
        textBlocks.push(letterBlock);
      }
      
      // Create Southwest brand colors material (orange/red and blue)
      const heartMaterial = new PBRMaterial("southwestHeart", this.scene);
      heartMaterial.baseColor = new Color3(1, 0.4, 0.1); // Southwest orange/red
      heartMaterial.roughness = 0.2;
      heartMaterial.metallicFactor = 0.1;
      heartMaterial.emissiveColor = new Color3(0.2, 0.08, 0.02); // Subtle glow
      
      const textMaterial = new PBRMaterial("southwestText", this.scene);
      textMaterial.baseColor = new Color3(0.1, 0.3, 0.8); // Southwest blue
      textMaterial.roughness = 0.3;
      textMaterial.metallicFactor = 0.2;
      textMaterial.emissiveColor = new Color3(0.02, 0.06, 0.16); // Subtle blue glow
      
      // Apply materials
      heartLeft.material = heartMaterial;
      heartRight.material = heartMaterial;
      heartBottom.material = heartMaterial;
      
      textBlocks.forEach(block => {
        block.material = textMaterial;
      });
      
      // Add dedicated lighting for the logo
      const logoLight = new DirectionalLight(
        "logoLight",
        new Vector3(0.5, -0.5, 0.5),
        this.scene
      );
      logoLight.intensity = 0.6;
      logoLight.position = new Vector3(-12, 6, -2);
      
      // Create a subtle spotlight effect
      const logoSpotlight = new HemisphericLight(
        "logoSpotlight",
        new Vector3(-1, 1, 1),
        this.scene
      );
      logoSpotlight.intensity = 0.3;
      logoSpotlight.diffuse = new Color3(1, 0.9, 0.8); // Warm light
      
      // Add subtle animation to make it more engaging
      const logoAnimation = Animation.CreateAndStartAnimation(
        "logoFloat",
        heartLeft,
        "position.y",
        30,
        120,
        3.3,
        3.5,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );
      
      // Apply same animation to other heart parts
      Animation.CreateAndStartAnimation(
        "logoFloat2",
        heartRight,
        "position.y",
        30,
        120,
        3.3,
        3.5,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );
      
      Animation.CreateAndStartAnimation(
        "logoFloat3",
        heartBottom,
        "position.y",
        30,
        120,
        2.4,
        2.6,
        Animation.ANIMATIONLOOPMODE_CYCLE
      );
      
      console.log('Southwest Airlines logo created at position (-15, 3, -5)');
    }

    private setupAudioSpectrum(): void {
      // Create audio spectrum visualization
      this.audioSpectrum = new AudioSpectrum(this.scene, {
        bandCount: 8,
        radius: 12, // Position outside main scene objects
        maxHeight: 4, // Maximum bar height
        smoothingFactor: 0.85 // Smooth animation
      });
    }
  
    private setupLighting(): void {
      // Ambient light
      const hemisphericLight = new HemisphericLight(
        "hemisphericLight",
        new Vector3(0, 1, 0),
        this.scene
      );
      hemisphericLight.intensity = 0.4;
  
      // Directional light for shadows
      const directionalLight = new DirectionalLight(
        "directionalLight",
        new Vector3(-1, -1, -1),
        this.scene
      );
      directionalLight.intensity = 0.8;
      directionalLight.position = new Vector3(10, 10, 10);
  
      // Shadow generator
      const shadowGenerator = new ShadowGenerator(1024, directionalLight);
      shadowGenerator.useExponentialShadowMap = true;
      
      // Add shadow casters
      this.scene.meshes.forEach(mesh => {
        if (mesh.name.includes('box') || mesh.name.includes('sphere') || mesh.name.includes('torus')) {
          shadowGenerator.addShadowCaster(mesh);
        }
      });
    }
  
    private createSkybox(textureUrl: string): void {
      const skybox = MeshBuilder.CreateSphere("skyBox", { diameter: 100 }, this.scene);
      const skyboxMaterial = new StandardMaterial("skyBox", this.scene);
      
      skyboxMaterial.backFaceCulling = false;
      skyboxMaterial.diffuseColor = new Color3(0.2, 0.6, 1);
      skyboxMaterial.specularColor = new Color3(0, 0, 0);
      skybox.material = skyboxMaterial;
      skybox.infiniteDistance = true;
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
      
      // Dispose audio spectrum
      if (this.audioSpectrum) {
        this.audioSpectrum.dispose();
        this.audioSpectrum = null;
      }
      
      this.scene.dispose();
      this.engine.dispose();
    }
  }