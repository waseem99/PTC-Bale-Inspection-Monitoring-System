import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraPreview } from './cameraPreview';
import { cameraPreviewSource, resolveCameraPreviewSource } from './cameraPreviewConfig';
import type { Camera } from './types';

const camera: Camera = {
  id: 'CAM-01', name: 'Camera 01', zone: 'Bale Entry', status: 'online', aiStatus: 'processing',
  lastFrameAt: new Date().toISOString(), fps: 18, streamQuality: '1080p', todayEvents: 1,
};

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

describe('camera preview', () => {
  it('defaults to the shared Google Drive camera clips', () => {
    expect(resolveCameraPreviewSource('CAM-01', {})).toEqual({
      url: 'https://drive.google.com/file/d/1Upew9D7Ypwn0FOsmJRxbSiylwjQGb240/preview',
      kind: 'iframe',
      origin: 'drive-default',
    });
    expect(resolveCameraPreviewSource('CAM-04', {})).toEqual({
      url: 'https://drive.google.com/file/d/1KHKi4dnOGoIT4rahSD07ASXQLbd8jQMz/preview',
      kind: 'iframe',
      origin: 'drive-default',
    });
  });

  it('uses only a non-secret preview-mode selector for local media', () => {
    expect(resolveCameraPreviewSource('CAM-01', { VITE_CAMERA_PREVIEW_MODE: 'local' })).toEqual({
      url: '/media/camera-01.mp4',
      kind: 'video',
      origin: 'local-default',
    });
  });

  it('ignores legacy per-camera Vite URL variables so RTSP credentials cannot enter the bundle path', () => {
    vi.stubEnv('VITE_CAMERA_01_PREVIEW_URL', 'rtsp://camera-user:camera-password@10.0.0.10/stream');
    expect(cameraPreviewSource('CAM-01')).toBe(
      'https://drive.google.com/file/d/1Upew9D7Ypwn0FOsmJRxbSiylwjQGb240/preview',
    );
  });

  it('renders local preview media only when the safe local mode is selected', () => {
    vi.stubEnv('VITE_CAMERA_PREVIEW_MODE', 'local');
    render(<CameraPreview camera={camera} />);
    const video = screen.getByLabelText('Video preview for Camera 01').querySelector('video');
    expect(video).toBeTruthy();
    expect(video?.autoplay).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(false);
    expect(video?.hasAttribute('controls')).toBe(false);
  });

  it('renders Google Drive defaults as an iframe', () => {
    render(<CameraPreview camera={camera} />);
    const frame = screen.getByTitle('Recorded preview for Camera 01');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute(
      'src',
      'https://drive.google.com/file/d/1Upew9D7Ypwn0FOsmJRxbSiylwjQGb240/preview',
    );
  });

  it('falls back to the synthetic preview when local media fails to load', () => {
    vi.stubEnv('VITE_CAMERA_PREVIEW_MODE', 'local');
    render(<CameraPreview camera={camera} />);
    const video = screen.getByLabelText('Video preview for Camera 01').querySelector('video');
    expect(video).toBeTruthy();
    fireEvent.error(video as HTMLVideoElement);
    expect(screen.getByLabelText('Synthetic preview for Camera 01')).toBeInTheDocument();
  });
});
