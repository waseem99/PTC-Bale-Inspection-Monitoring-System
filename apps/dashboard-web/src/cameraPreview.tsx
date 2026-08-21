import { useState } from 'react';
import { CameraScene } from './components';
import { resolveCameraPreviewSource } from './cameraPreviewConfig';
import type { Camera } from './types';

export function CameraPreview({ camera }: { camera: Camera }) {
  const source = resolveCameraPreviewSource(camera.id);
  const [failedUrl, setFailedUrl] = useState<string>();

  if (!source || failedUrl === source.url) return <CameraScene camera={camera} />;

  const degraded = camera.status !== 'online' || camera.aiStatus !== 'processing';
  const commonStyle = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', border: 0, background: '#101820' };

  return <div className={`camera-scene ${degraded ? 'camera-scene--degraded' : ''}`} aria-label={`Video preview for ${camera.name}`}>
    {source.kind === 'iframe'
      ? <iframe
          src={source.url}
          title={`Recorded preview for ${camera.name}`}
          allow="autoplay; fullscreen"
          loading="lazy"
          onError={() => setFailedUrl(source.url)}
          style={commonStyle}
        />
      : <video
          src={source.url}
          controls
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setFailedUrl(source.url)}
          style={{ ...commonStyle, objectFit: 'cover' }}
        />}
    <span className="camera-id-overlay">{camera.id}</span>
    <span className="camera-mode-overlay">VIDEO PREVIEW</span>
    {degraded && <span className="camera-warning-overlay">DEGRADED</span>}
  </div>;
}
