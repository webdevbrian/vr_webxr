import {
  Scene,
  SceneLoader,
  AbstractMesh,
  Vector3,
  PhysicsImpostor,
  Texture,
  PBRMaterial,
  Material
} from '@babylonjs/core';

export interface ModelConfig {
  path: string;
  fileName: string;
  position: Vector3;
  scale: Vector3;
  rotation?: Vector3;
  enablePhysics?: boolean;
  physicsType?: number;
  physicsMass?: number;
  textureBasePath?: string;
}

export class ModelLoader {
  private scene: Scene;
  private loadedModels: Map<string, AbstractMesh[]> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public async loadModel(config: ModelConfig): Promise<AbstractMesh[]> {
    try {
      console.log(`Loading model: ${config.fileName} from ${config.path}`);
      
      // Load the GLB model
      const result = await SceneLoader.ImportMeshAsync(
        "",
        config.path,
        config.fileName,
        this.scene
      );

      const meshes = result.meshes;
      
      if (meshes.length === 0) {
        throw new Error(`No meshes found in model: ${config.fileName}`);
      }

      // Get the root mesh (usually the first mesh or find by name)
      const rootMesh = meshes[0];
      
      // Apply transformations
      rootMesh.position = config.position.clone();
      rootMesh.scaling = config.scale.clone();
      
      if (config.rotation) {
        rootMesh.rotation = config.rotation.clone();
      }

      // Apply custom textures if provided
      if (config.textureBasePath) {
        this.applyCustomTextures(meshes, config.textureBasePath);
      }

      // Enable physics if requested
      if (config.enablePhysics) {
        this.enablePhysicsForModel(meshes, config);
      }

      // Store loaded model
      this.loadedModels.set(config.fileName, meshes);
      
      console.log(`Successfully loaded model: ${config.fileName} with ${meshes.length} meshes`);
      return meshes;
      
    } catch (error) {
      console.error(`Failed to load model ${config.fileName}:`, error);
      throw error;
    }
  }

  private applyCustomTextures(meshes: AbstractMesh[], textureBasePath: string): void {
    // Define texture mappings for tank model
    const textureFiles = [
      '0.dds', '1.dds', '2.dds', '3.dds', '4.dds',
      '5.dds', '6.dds', '7.dds', '8.dds', '9.dds',
      'centurion#d.dds', 'centurion.dds', 'track_pz5.dds',
      'vickers.dds', 'vickers_sp.dds'
    ];

    meshes.forEach((mesh, index) => {
      if (mesh.material) {
        // Create new PBR material for better lighting
        const newMaterial = new PBRMaterial(`${mesh.name}_material`, this.scene);
        
        // Try to find appropriate texture for this mesh
        let textureFile = textureFiles[index % textureFiles.length];
        
        // Use specific textures based on mesh name patterns
        if (mesh.name.toLowerCase().includes('track')) {
          textureFile = 'track_pz5.dds';
        } else if (mesh.name.toLowerCase().includes('centurion')) {
          textureFile = 'centurion.dds';
        } else if (mesh.name.toLowerCase().includes('vickers')) {
          textureFile = 'vickers.dds';
        }

        try {
          const texture = new Texture(`${textureBasePath}/${textureFile}`, this.scene);
          newMaterial.albedoTexture = texture;
          newMaterial.baseColor = new Color3(1, 1, 1); // Pure white to show texture
          newMaterial.roughness = 0.7; // Realistic metal roughness
          newMaterial.metallicFactor = 0.8; // High metallic for tank armor
          newMaterial.emissiveColor = new Color3(0, 0, 0); // No emission as requested
          
          mesh.material = newMaterial;
        } catch (textureError) {
          console.warn(`Failed to load texture ${textureFile} for mesh ${mesh.name}:`, textureError);
          // Keep original material if texture loading fails
        }
      }
    });
  }

  private enablePhysicsForModel(meshes: AbstractMesh[], config: ModelConfig): void {
    const physicsType = config.physicsType || PhysicsImpostor.BoxImpostor;
    const mass = config.physicsMass || 0; // 0 = static/immovable

    meshes.forEach(mesh => {
      if (mesh.geometry) {
        try {
          mesh.physicsImpostor = new PhysicsImpostor(
            mesh,
            physicsType,
            {
              mass: mass,
              restitution: 0.1, // Low bounce for solid objects
              friction: 0.9 // High friction
            },
            this.scene
          );
        } catch (physicsError) {
          console.warn(`Failed to add physics to mesh ${mesh.name}:`, physicsError);
        }
      }
    });
  }

  public getLoadedModel(fileName: string): AbstractMesh[] | undefined {
    return this.loadedModels.get(fileName);
  }

  public getAllLoadedModels(): Map<string, AbstractMesh[]> {
    return new Map(this.loadedModels);
  }

  public disposeModel(fileName: string): void {
    const meshes = this.loadedModels.get(fileName);
    if (meshes) {
      meshes.forEach(mesh => {
        if (mesh.material) {
          mesh.material.dispose();
        }
        mesh.dispose();
      });
      this.loadedModels.delete(fileName);
    }
  }

  public dispose(): void {
    this.loadedModels.forEach((meshes, fileName) => {
      this.disposeModel(fileName);
    });
    this.loadedModels.clear();
  }
}