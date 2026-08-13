import { CameraScene } from './components';
import { cameraPreviewSource } from './cameraPreviewConfig';
import type { Camera } from './types';

export function CameraPreview({ camera }: { camera: Camera }) {
  const source = cameraPreviewSource(camera.id);
  if (!source) return <CameraScene camera={camera} />;
  const degraded = camera.status !== 'online' || camera.aiStatus !== 'processing';
  return <div className={`camera-scene ${degraded ? 'camera-scene--degraded' : ''}`} aria-label={`Video preview for ${camera.name}`}>
    <video src={source} controls muted playsInline preload="metadata" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#101820' }} />
    <span className="camera-id-overlay">{camera.id}</span>
    <span className="camera-mode-overlay">VIDEO PREVIEW</span>
    {degraded && <span className="camera-warning-overlay">DEGRADED</span>}
  </div>;
}
