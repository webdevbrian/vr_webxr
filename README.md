# VR WebXR Experimental Project

A comprehensive WebXR experience built with Babylon.js, showcasing advanced VR development techniques and real-time audio visualization. This project serves as a technical exploration of modern WebXR standards and Babylon.js capabilities.

## 🚀 Live Demo

**Experience it here:** https://vr-webxr.vercel.app/

## 🎯 Project Overview

This project was developed as a technical exploration of WebXR standards and Babylon.js capabilities, focusing on creating an immersive cyberpunk environment with real-time audio visualization and advanced VR interactions.

### Key Experiments & Features

#### 🎵 **Real-Time Audio Visualization**
- **Microphone Input Processing**: Real-time audio spectrum analysis using Web Audio API
- **Dynamic Visual Response**: 3D cylindrical bars that respond to frequency bands
- **Particle System**: Animated particles that emit from audio-reactive cylinders
- **Cyberpunk Color Gradients**: Dynamic color transitions based on audio intensity
- **Smooth Interpolation**: Advanced smoothing algorithms for fluid visual responses

#### 🎮 **Advanced VR Interactions**
- **Multi-Controller Support**: Full support for Valve Index Knuckles and other VR controllers
- **Head Tracking**: Real-time head position and rotation tracking
- **Teleportation System**: Smooth VR locomotion with visual indicators
- **Physics Integration**: Cannon.js physics for realistic object interactions
- **FOV Adjustment**: Dynamic field-of-view controls for comfort optimization

#### 🌆 **Immersive Cyberpunk Environment**
- **PBR Materials**: Physically-based rendering for realistic lighting and reflections
- **Dynamic Lighting**: Multiple light sources with volumetric effects
- **Reflection Probes**: Real-time reflections on wet asphalt surfaces
- **Atmospheric Effects**: Post-processing pipeline with SSAO and bloom effects
- **3D Model Integration**: GLTF/GLB model loading with texture support

#### 📊 **Performance & Monitoring**
- **Real-time Statistics**: FPS, draw calls, and vertex count monitoring
- **VR Session Data**: Comprehensive tracking of VR state and controller data
- **Responsive Design**: Adaptive UI that works across desktop and VR modes
- **Memory Management**: Efficient resource disposal and cleanup

## 🛠️ Technology Stack

### Core Technologies
- **Babylon.js 8.15.1**: Advanced 3D engine with WebXR support
- **React 18.3.1**: Modern UI framework with TypeScript
- **Vite 5.4.2**: Fast build tool and development server
- **TypeScript 5.5.3**: Type-safe development environment

### VR & 3D Libraries
- **@babylonjs/core**: Core 3D engine functionality
- **@babylonjs/gui**: VR-compatible UI components
- **@babylonjs/loaders**: GLTF/GLB model loading
- **@babylonjs/materials**: PBR material system
- **@babylonjs/serializers**: Scene serialization
- **cannon-es 0.20.0**: Physics engine for realistic interactions

### Development Tools
- **Tailwind CSS 3.4.1**: Utility-first CSS framework
- **ESLint 9.9.1**: Code quality and consistency
- **PostCSS 8.4.35**: CSS processing and optimization
- **Lucide React 0.344.0**: Modern icon library

## 🎮 VR Hardware Support

### Tested Hardware
- **Varjo Aero**: High-resolution VR headset with 4 base stations
- **Valve Index Knuckles**: Advanced hand tracking controllers
- **Steam Base Stations**: Precise positional tracking

### WebXR Features Implemented
- **Session Management**: Enter/exit VR with proper state handling
- **Controller Tracking**: Full 6DOF controller support
- **Head Tracking**: Real-time head position and orientation
- **Haptic Feedback**: Controller vibration support (framework ready)
- **Room-Scale VR**: Full room-scale movement support

## 🔬 Technical Experiments

### Audio Visualization System
```typescript
// Real-time frequency analysis with Web Audio API
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
const frequencyData = new Uint8Array(analyser.frequencyBinCount);
```

### Advanced Physics Integration
```typescript
// Cannon.js physics with custom materials
scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin());
ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {
  mass: 0,
  restitution: 0.2,
  friction: 0.9
});
```

### PBR Material System
```typescript
// Physically-based rendering for realistic surfaces
const material = new PBRMaterial("groundMaterial", scene);
material.albedoTexture = asphaltTexture;
material.roughness = 0.2;
material.metallicFactor = 0.7;
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Modern browser with WebXR support
- VR headset (optional for full experience)

### Installation
```bash
# Clone the repository
git clone https://github.com/webdevbrian/vr-webxr.git
cd vr-webxr

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🎨 Project Structure

```
src/
├── components/
│   ├── AudioSpectrum.ts      # Real-time audio visualization
│   ├── SceneStats.tsx        # Performance monitoring
│   ├── VRInterface.tsx       # VR controls and UI
│   └── VRScene.ts           # Main 3D scene management
├── types/
│   └── VRTypes.ts           # TypeScript interfaces
├── utils/
│   ├── ModelLoader.ts        # 3D model loading utilities
│   └── VRUtils.ts           # VR helper functions
└── App.tsx                  # Main application component
```

## 🔮 Future Features

### Planned Enhancements
- **HTC Vive Tracker Support**: Full body tracking integration
- **Steam Base Station Integration**: Enhanced positional tracking
- **Hand Gesture Recognition**: Advanced hand tracking and gestures
- **Multiplayer Support**: Collaborative VR experiences
- **Advanced Audio Effects**: 3D spatial audio and reverb
- **Custom Shaders**: GLSL shader development for visual effects

### Technical Roadmap
- **WebGPU Integration**: Next-generation graphics API
- **WebAssembly Physics**: High-performance physics simulation
- **Procedural Generation**: Dynamic environment creation
- **AI Integration**: Intelligent NPCs and interactions

## 🤝 Contributing

This project is open for contributions! Areas of interest:
- Audio visualization improvements
- VR interaction enhancements
- Performance optimizations
- New visual effects
- Documentation improvements

## 📄 License

This project is developed for educational and experimental purposes. Feel free to use and modify for your own projects.

## 👨‍💻 Author

**Brian Kinney** - [GitHub](https://github.com/webdevbrian)

Built with ❤️ using modern web technologies and a passion for immersive experiences.

---

*This project showcases the power of WebXR standards and Babylon.js for creating next-generation virtual reality experiences on the web.*
