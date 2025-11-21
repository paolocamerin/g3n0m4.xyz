# AR Hat App

A web-based AR application for face tracking and 3D model visualization.

## Phase 1: Camera Access ✅

This phase implements basic camera access and display functionality.

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features (Phase 1)

- ✅ Camera access via getUserMedia API
- ✅ Responsive layout for mobile and desktop
- ✅ Error handling for camera permissions
- ✅ Loading states
- ✅ Mirror mode for natural selfie view

## Testing on Mobile

1. Make sure your computer and phone are on the same network
2. Find your computer's local IP address
3. Run `npm run dev`
4. Access `http://YOUR_IP:5173` from your phone's browser
5. Grant camera permissions when prompted

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Safari (iOS 14.3+): ✅ Full support
- Firefox: ✅ Full support

**Note:** HTTPS is required for camera access in production. For local development, `localhost` works without HTTPS.

## Next Steps

- Phase 2: QR Code Detection
- Phase 3: Face Tracking Integration
- Phase 4: 3D Model Loading
- Phase 5: AR Integration

