import React, { useEffect, useRef, useState } from 'react';
import { VRSceneManager } from './components/VRScene';
import { VRInterface } from './components/VRInterface';
import { SceneStats } from './components/SceneStats';
import { VRSessionData } from './types/VRTypes';
import { checkVRSupport } from './utils/VRUtils';
import { Eye, Sparkles, Gamepad2 } from 'lucide-react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<VRSceneManager | null>(null);
  const [vrSessionData, setVRSessionData] = useState<VRSessionData>({
    isActive: false,
    isSupported: false,
    controllers: [],
    headPosition: { x: 0, y: 0, z: 0 },
    headRotation: { x: 0, y: 0, z: 0 }
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeVR = async () => {
      if (!canvasRef.current) return;

      try {
        // Check VR support
        const vrSupported = await checkVRSupport();
        setVRSessionData(prev => ({ ...prev, isSupported: vrSupported }));

        // Initialize scene
        const sceneManager = new VRSceneManager(canvasRef.current, {
          enablePhysics: true,
          enableAudio: true,
          enableTeleportation: true
        });

        sceneManagerRef.current = sceneManager;
        sceneManager.startRenderLoop();
        setIsInitialized(true);

        // Update VR session data periodically
        const updateInterval = setInterval(() => {
          if (sceneManagerRef.current) {
            const sessionData = sceneManagerRef.current.getVRSessionData();
            setVRSessionData(sessionData);
          }
        }, 100);

        return () => {
          clearInterval(updateInterval);
          sceneManager.dispose();
        };
      } catch (error) {
        console.error('Failed to initialize VR:', error);
      }
    };

    initializeVR();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleEnterVR = async (): Promise<boolean> => {
    if (!sceneManagerRef.current) return false;
    return await sceneManagerRef.current.enterVR();
  };

  const handleExitVR = async (): Promise<void> => {
    if (!sceneManagerRef.current) return;
    await sceneManagerRef.current.exitVR();
  };

  const handleUpdateFOV = (fov: number): void => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.updateCameraFOV(fov);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        {/* VR Scene Canvas */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ 
              minHeight: '500px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          />
          
          {/* Loading overlay */}
          {!isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center text-white">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold mb-2">Initializing VR Scene</h2>
                <p className="text-purple-200">Setting up your immersive experience with audio visualization...</p>
              </div>
            </div>
          )}

          {/* VR Status Indicator */}
          {vrSessionData.isActive && (
            <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-white font-medium">
              <Eye className="w-5 h-5" />
              VR Active
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="w-full lg:w-96 p-6 space-y-6 bg-black/20 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">VR Explorer</h1>
                <p className="text-purple-200">Babylon.js 3D & Web-XR</p>
                <p className="text-sm text-purple-300">by Brian Kinney (github.com/webdevbrian)</p>
              </div>
            </div>
          </div>

          {/* VR Interface */}
          <VRInterface
            vrSessionData={vrSessionData}
            onEnterVR={handleEnterVR}
            onExitVR={handleExitVR}
            onUpdateFOV={handleUpdateFOV}
          />

          {/* Scene Stats */}
          <SceneStats 
            isVRActive={vrSessionData.isActive} 
            sceneManager={sceneManagerRef.current}
          />

          {/* Future Features */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Future Features</h3>
                <p className="text-gray-600">Coming soon</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                HTC Vive Tracker Support
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Steam Base Station Integration
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Full Body Tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Hand Gesture Recognition
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;