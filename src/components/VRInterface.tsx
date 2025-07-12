import React, { useEffect, useState } from 'react';
import { Eye, Gamepad2, Headphones, Settings, Zap, Wifi, X, Volume2, Vibrate, Monitor } from 'lucide-react';
import { VRSessionData } from '../types/VRTypes';
import { getVRDeviceInfo, formatVRPosition } from '../utils/VRUtils';

interface VRInterfaceProps {
  vrSessionData: VRSessionData;
  onEnterVR: () => Promise<boolean>;
  onExitVR: () => Promise<void>;
  onUpdateFOV: (fov: number) => void;
}

export const VRInterface: React.FC<VRInterfaceProps> = ({
  vrSessionData,
  onEnterVR,
  onExitVR,
  onUpdateFOV
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    audioEnabled: true,
    hapticFeedback: true,
    teleportationEnabled: true,
    renderQuality: 'high' as 'low' | 'medium' | 'high',
    fov: 90
  });

  useEffect(() => {
    setDeviceInfo(getVRDeviceInfo());
  }, []);

  const handleEnterVR = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await onEnterVR();
      if (!success) {
        setError('Failed to enter VR mode. Please check your headset connection.');
      }
    } catch (err) {
      setError('VR session failed to start. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitVR = async () => {
    setIsLoading(true);
    try {
      await onExitVR();
    } catch (err) {
      setError('Failed to exit VR mode.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the setting changes

  const handleSettingsChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply FOV changes immediately
    if (key === 'fov') {
      onUpdateFOV(value);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20 relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <Eye className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">VR Experience</h2>
        </div>
      </div>

      {/* VR Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Wifi className={`w-5 h-5 ${vrSessionData.isSupported ? 'text-green-500' : 'text-red-500'}`} />
          <div>
            <p className="text-sm font-medium">VR Support</p>
            <p className="text-xs text-gray-600">
              {vrSessionData.isSupported ? 'Available' : 'Not Available'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Zap className={`w-5 h-5 ${vrSessionData.isActive ? 'text-green-500' : 'text-gray-400'}`} />
          <div>
            <p className="text-sm font-medium">Session</p>
            <p className="text-xs text-gray-600">
              {vrSessionData.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Device Information */}
      {deviceInfo && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Headphones className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Device Info</h3>
          </div>
          <p className="text-sm text-gray-700">{deviceInfo}</p>
          <p className="text-xs text-gray-500 mt-1">
            Make sure your headset is connected and Steam VR is running.
          </p>
        </div>
      )}

      {/* VR Session Data */}
      {vrSessionData.isActive && (
        <div className="mb-6 space-y-3">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">Head Tracking</span>
            </div>
            <p className="text-sm text-green-700">
              Position: {formatVRPosition(vrSessionData.headPosition)}
            </p>
            <p className="text-sm text-green-700">
              Rotation: {formatVRPosition(vrSessionData.headRotation)}
            </p>
          </div>
          
          {vrSessionData.controllers.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Controllers</span>
              </div>
              <p className="text-sm text-blue-700">
                {vrSessionData.controllers.length} controller(s) connected
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!vrSessionData.isActive ? (
          <button
            onClick={handleEnterVR}
            disabled={!vrSessionData.isSupported || isLoading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              vrSessionData.isSupported && !isLoading
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Eye className="w-5 h-5" />
            {isLoading ? 'Starting VR...' : 'Enter VR'}
          </button>
        ) : (
          <button
            onClick={handleExitVR}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Eye className="w-5 h-5" />
            {isLoading ? 'Exiting...' : 'Exit VR'}
          </button>
        )}
        
        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">VR Controls</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Look around to explore the environment</li>
          <li>• Use controllers to point and teleport</li>
          <li>• Future: HTC Tracker support via Steam Base Stations</li>
        </ul>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">VR Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Audio Settings */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-800">Audio</h4>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.audioEnabled}
                    onChange={(e) => handleSettingsChange('audioEnabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Enable spatial audio</span>
                </label>
              </div>

              {/* Haptic Feedback */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Vibrate className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-800">Haptics</h4>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.hapticFeedback}
                    onChange={(e) => handleSettingsChange('hapticFeedback', e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700">Enable controller vibration</span>
                </label>
              </div>

              {/* Teleportation */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-800">Movement</h4>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.teleportationEnabled}
                    onChange={(e) => handleSettingsChange('teleportationEnabled', e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-gray-700">Enable teleportation</span>
                </label>
              </div>

              {/* Render Quality */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-gray-800">Graphics</h4>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Render Quality
                  </label>
                  <select
                    value={settings.renderQuality}
                    onChange={(e) => handleSettingsChange('renderQuality', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="low">Low (Better Performance)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Better Quality)</option>
                  </select>
                </div>
              </div>

              {/* Field of View */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field of View: {settings.fov}°
                </label>
                <input
                  type="range"
                  min="70"
                  max="110"
                  value={settings.fov}
                  onChange={(e) => handleSettingsChange('fov', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>70°</span>
                  <span>110°</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Apply all settings to the VR scene
                  console.log('Applying VR settings:', settings);
                  onUpdateFOV(settings.fov);
                  setShowSettings(false);
                }}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};