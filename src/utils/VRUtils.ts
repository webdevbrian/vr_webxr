import { WebXRFeatureName } from '@babylonjs/core/XR';

export const VR_FEATURES = {
  HAND_TRACKING: WebXRFeatureName.HAND_TRACKING,
  TELEPORTATION: WebXRFeatureName.TELEPORTATION,
  POINTER_SELECTION: WebXRFeatureName.POINTER_SELECTION,
  PHYSICS_CONTROLLERS: WebXRFeatureName.PHYSICS_CONTROLLERS,
};

export const checkVRSupport = async (): Promise<boolean> => {
  if (!navigator.xr) {
    console.warn('WebXR not supported on this browser');
    return false;
  }
  
  try {
    const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
    return isSupported;
  } catch (error) {
    console.error('Error checking VR support:', error);
    return false;
  }
};

export const getVRDeviceInfo = (): string => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('OculusVR')) {
    return 'Meta Quest';
  } else if (userAgent.includes('SteamVR')) {
    return 'SteamVR';
  } else if (userAgent.includes('WindowsMR')) {
    return 'Windows Mixed Reality';
  }
  
  return 'Generic VR Device';
};

export const formatVRPosition = (position: { x: number; y: number; z: number }): string => {
  return `(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
};