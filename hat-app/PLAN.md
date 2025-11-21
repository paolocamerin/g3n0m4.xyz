# AR Face Tracking App - Plan of Action

## Project Overview
Building a web-based AR application that tracks faces and displays animated 3D models anchored to facial features. The app will run in mobile and desktop browsers, access the device camera, read QR codes for conditional content display, and render animated 3D models.

---

## Framework Recommendations

### **Recommended Stack: React + React Three Fiber**

**Primary Recommendation: React Three Fiber (R3F) with React**

**Why React Three Fiber?**
- ✅ Declarative React approach - easier to manage state and components
- ✅ Built on Three.js - full access to Three.js capabilities
- ✅ Great ecosystem with `@react-three/drei` helpers
- ✅ Excellent performance optimizations
- ✅ Component-based architecture fits complex AR apps
- ✅ Easy integration with React hooks for camera/QR code state management

**Alternative: Vanilla Three.js**
- ✅ More lightweight (no React overhead)
- ✅ Direct control over rendering loop
- ✅ Better for simple, single-page apps
- ❌ More imperative code, harder to manage complex state

### **Supporting Libraries**

1. **Face Tracking: MediaPipe Face Mesh**
   - `@mediapipe/face_mesh` - Google's solution, excellent browser performance
   - Provides 468 facial landmarks
   - Real-time tracking with good accuracy
   - Works well on mobile devices

2. **QR Code Reading:**
   - `jsQR` - Lightweight, pure JavaScript
   - OR `html5-qrcode` - More features, better error handling
   - Both work well with camera streams

3. **3D Model Format: GLTF/GLB (NOT FBX)**
   - ✅ GLTF is the web standard
   - ✅ Smaller file sizes
   - ✅ Better browser support
   - ✅ Built-in animation support
   - ✅ Three.js has excellent GLTF loader
   - ❌ FBX requires conversion/extra libraries

4. **Camera Access:**
   - Native `getUserMedia()` API
   - Consider `react-webcam` for React apps (optional helper)

---

## Technical Architecture

### Core Components

1. **Camera Manager**
   - Request camera permissions
   - Handle camera stream
   - Provide video feed to other components

2. **QR Code Scanner**
   - Continuously scan camera feed
   - Decode QR codes
   - Trigger conditional logic based on QR content

3. **Face Tracker**
   - Initialize MediaPipe Face Mesh
   - Process video frames
   - Extract facial landmarks
   - Calculate face position/orientation

4. **3D Scene Manager**
   - Initialize Three.js/R3F scene
   - Load GLTF model
   - Anchor model to face tracking points
   - Handle animations

5. **AR Renderer**
   - Overlay 3D scene on camera feed
   - Sync face tracking with 3D model position
   - Handle rendering loop

---

## Development Phases

### Phase 1: Project Setup & Camera Access
**Goals:**
- Set up React/React Three Fiber project (or vanilla Three.js)
- Implement camera access via `getUserMedia()`
- Display camera feed in browser
- Test on mobile and desktop

**Deliverables:**
- Basic app structure
- Working camera feed
- Responsive layout

---

### Phase 2: QR Code Detection
**Goals:**
- Integrate QR code library (jsQR or html5-qrcode)
- Scan camera feed for QR codes
- Display decoded QR content
- Implement conditional logic based on QR data

**Deliverables:**
- QR code scanning functionality
- Conditional content display system

---

### Phase 3: Face Tracking Integration
**Goals:**
- Integrate MediaPipe Face Mesh
- Initialize face tracking on camera feed
- Extract facial landmarks
- Visualize tracking points (for debugging)
- Calculate face position, rotation, scale

**Deliverables:**
- Working face tracking
- Face landmark visualization
- Face transform calculations

---

### Phase 4: 3D Model Loading & Display
**Goals:**
- Set up GLTF loader
- Load 3D model (GLTF/GLB format)
- Display model in 3D scene
- Test model animations
- Optimize model size/quality

**Deliverables:**
- 3D model loading system
- Model display in scene
- Animation playback

---

### Phase 5: AR Integration - Anchoring Model to Face
**Goals:**
- Map face landmarks to 3D model anchor points
- Calculate model position based on face tracking
- Sync model rotation with face orientation
- Scale model based on face size
- Handle face detection loss (hide/show model)

**Deliverables:**
- Model anchored to face
- Smooth tracking
- Robust face loss handling

---

### Phase 6: Performance Optimization
**Goals:**
- Optimize rendering performance
- Reduce frame processing overhead
- Optimize 3D model (poly count, textures)
- Test on various devices
- Implement performance monitoring

**Deliverables:**
- Smooth 60fps performance
- Mobile optimization
- Performance metrics

---

### Phase 7: Polish & Testing
**Goals:**
- UI/UX improvements
- Error handling
- Loading states
- Cross-browser testing
- Mobile device testing
- User feedback collection

**Deliverables:**
- Polished application
- Comprehensive testing report
- Deployment-ready app

---

## Technical Considerations

### Browser Compatibility
- **Camera API:** Modern browsers (Chrome, Safari, Firefox, Edge)
- **WebGL:** Required for Three.js (widely supported)
- **MediaPipe:** Works in Chrome, Edge, Safari (iOS 14.3+)
- **HTTPS Required:** Camera access requires HTTPS (or localhost)

### Performance Targets
- **Frame Rate:** 30-60 FPS
- **Face Tracking Latency:** < 100ms
- **Model File Size:** < 5MB (optimized GLTF)
- **Initial Load:** < 3 seconds

### Mobile Considerations
- Touch interactions
- Battery optimization
- Network constraints
- Screen orientation handling
- Permission prompts UX

---

## File Structure (React Three Fiber Example)

```
ar-hat-app/
├── src/
│   ├── components/
│   │   ├── Camera/
│   │   │   └── CameraFeed.jsx
│   │   ├── QRScanner/
│   │   │   └── QRCodeScanner.jsx
│   │   ├── FaceTracker/
│   │   │   └── FaceTracking.jsx
│   │   ├── ARScene/
│   │   │   ├── ARCanvas.jsx
│   │   │   └── FaceAnchoredModel.jsx
│   │   └── UI/
│   │       └── Controls.jsx
│   ├── hooks/
│   │   ├── useCamera.js
│   │   ├── useQRScanner.js
│   │   └── useFaceTracking.js
│   ├── utils/
│   │   ├── faceUtils.js
│   │   └── modelLoader.js
│   ├── models/
│   │   └── hat.gltf (or .glb)
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── README.md
```

---

## Dependencies (React Three Fiber Stack)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "three": "^0.158.0",
    "@mediapipe/face_mesh": "^0.4.0",
    "@mediapipe/camera_utils": "^0.3.0",
    "jsqr": "^1.4.0",
    "zustand": "^4.4.0" // Optional: state management
  }
}
```

---

## Key Challenges & Solutions

### Challenge 1: Face Tracking Accuracy
**Solution:** Use MediaPipe Face Mesh, which provides 468 landmarks and is optimized for real-time performance.

### Challenge 2: Model Anchoring
**Solution:** Map key facial landmarks (nose tip, forehead, etc.) to model anchor points. Use quaternion rotations for smooth orientation.

### Challenge 3: Performance on Mobile
**Solution:** 
- Throttle face tracking processing
- Use lower resolution camera feed for tracking
- Optimize 3D model (LOD, texture compression)
- Use requestAnimationFrame efficiently

### Challenge 4: Camera Permissions
**Solution:** Implement clear permission prompts and fallback UI for denied permissions.

### Challenge 5: QR Code Scanning Performance
**Solution:** Scan every Nth frame instead of every frame to reduce CPU usage.

---

## Next Steps

1. **Decide on framework:** React Three Fiber vs Vanilla Three.js
2. **Set up project:** Initialize with chosen framework
3. **Start Phase 1:** Implement camera access
4. **Prepare 3D model:** Convert FBX to GLTF if needed (use Blender or online converters)

---

## Resources & Documentation

- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh)
- [Three.js GLTF Loader](https://threejs.org/docs/#manual/en/introduction/Loading-3D-models)
- [jsQR Documentation](https://github.com/cozmo/jsQR)
- [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API) (for future AR features)

---

## Notes

- **GLTF vs FBX:** Strongly recommend GLTF format. If you have FBX files, convert them using Blender (free) or online tools like [glTF-Pipeline](https://github.com/CesiumGS/gltf-pipeline)
- **Face Tracking Alternative:** If MediaPipe doesn't meet needs, consider TensorFlow.js Face Landmarks Detection (less accurate but more customizable)
- **AR.js Consideration:** AR.js is marker-based AR, not face tracking. Not suitable for this project but good to know about.

---

**Last Updated:** 2024
**Status:** Planning Phase

