export interface VRSceneConfig {
    enablePhysics: boolean;
    enableAudio: boolean;
    enableTeleportation: boolean;
    skyboxTexture?: string;
  }
  
  export interface VRControllerData {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    connected: boolean;
  }
  
  export interface VRSessionData {
    isActive: boolean;
    isSupported: boolean;
    controllers: VRControllerData[];
    headPosition: { x: number; y: number; z: number };
    headRotation: { x: number; y: number; z: number };
  }