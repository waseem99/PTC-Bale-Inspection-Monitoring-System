import { useEffect, useRef, useState, type RefObject } from 'react';
import { CameraScene } from './components';
import { resolveCameraPreviewSource } from './cameraPreviewConfig';
import type { Camera } from './types';

function safePlay(video: HTMLVideoElement) {
  try {
    const result = video.play();
    if (result && typeof result.catch === 'function') void result.catch(() => undefined);
  } catch {
    /* jsdom / autoplay policy */
  }
}

/** Continuous muted forward/reverse playback for local camera preview clips. */
function usePingPongPlayback(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    if (!video) return;

    let reversing = false;
    let rafId = 0;
    let lastTs = 0;

    const stopReverse = () => {
      reversing = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const reverseStep = (ts: number) => {
      if (!reversing) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const next = video.currentTime - dt;
      if (next <= 0.02) {
        stopReverse();
        video.currentTime = 0;
        safePlay(video);
        return;
      }
      video.currentTime = next;
      rafId = requestAnimationFrame(reverseStep);
    };

    const onEnded = () => {
      stopReverse();
      reversing = true;
      lastTs = 0;
      video.pause();
      rafId = requestAnimationFrame(reverseStep);
    };

    video.muted = true;
    video.volume = 0;
    video.addEventListener('ended', onEnded);
    safePlay(video);

    return () => {
      video.removeEventListener('ended', onEnded);
      stopReverse();
    };
  }, [enabled, videoRef]);
}

export function CameraPreview({ camera }: { camera: Camera }) {
  const source = resolveCameraPreviewSource(camera.id);
  const [failedUrl, setFailedUrl] = useState<string>();
  const [liveNonce, setLiveNonce] = useState(0);
  const liveRetries = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const useVideo = Boolean(source && source.kind === 'video' && failedUrl !== source.url);

  usePingPongPlayback(videoRef, useVideo);

  useEffect(() => {
    liveRetries.current = 0;
    setFailedUrl(undefined);
    setLiveNonce(0);
  }, [source?.url]);

  if (!source || failedUrl === source.url) return <CameraScene camera={camera} />;

  const degraded = camera.status !== 'online' || (camera.aiStatus !== 'processing' && camera.aiStatus !== 'ready');
  const commonStyle = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', border: 0, background: '#101820' };
  const live = source.origin === 'live-ai';
  const liveSrc = live && liveNonce > 0 ? `${source.url}${source.url.includes('?') ? '&' : '?'}_r=${liveNonce}` : source.url;

  const onLiveError = () => {
    if (liveRetries.current >= 8) {
      setFailedUrl(source.url);
      return;
    }
    liveRetries.current += 1;
    window.setTimeout(() => setLiveNonce((n) => n + 1), Math.min(8_000, 750 * liveRetries.current));
  };

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
      : source.kind === 'mjpeg'
        ? <img
            key={liveSrc}
            src={liveSrc}
            alt={`Live AI preview for ${camera.name}`}
            onError={onLiveError}
            style={{ ...commonStyle, objectFit: 'cover' }}
          />
        : <video
            ref={videoRef}
            src={source.url}
            autoPlay
            muted
            playsInline
            preload="auto"
            onError={() => setFailedUrl(source.url)}
            style={{ ...commonStyle, objectFit: 'cover' }}
          />}
    <span className="camera-id-overlay">{camera.id}</span>
    <span className="camera-mode-overlay">{live ? 'LIVE AI' : 'VIDEO PREVIEW'}</span>
    {degraded && <span className="camera-warning-overlay">DEGRADED</span>}
  </div>;
}
