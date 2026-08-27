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
  it('maps a configured direct preview to the matching camera', () => {
    const environment = { VITE_CAMERA_01_PREVIEW_URL: 'https://media.example.test/camera-01.mp4' };
    expect(cameraPreviewSource('CAM-01', environment)).toBe('https://media.example.test/camera-01.mp4');
    expect(cameraPreviewSource('CAM-02', environment)).toBe(
      'https://drive.google.com/file/d/1154WOX30kN0Mk9rvyJeZv4cVYQbW6R7_/preview',
    );
  });

  it('defaults to the shared Google Drive camera clips when no override is configured', () => {
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

  it('normalizes Google Drive file links into iframe previews', () => {
    const source = resolveCameraPreviewSource('CAM-01', {
      VITE_CAMERA_01_PREVIEW_URL: 'https://drive.google.com/file/d/example-file-id/view?usp=sharing',
    });
    expect(source).toEqual({
      url: 'https://drive.google.com/file/d/example-file-id/preview',
      kind: 'iframe',
      origin: 'configured',
    });
  });

  it('renders direct video media muted with continuous ping-pong playback', () => {
    vi.stubEnv('VITE_CAMERA_01_PREVIEW_URL', '/media/camera-01.mp4');
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
    vi.stubEnv('VITE_CAMERA_01_PREVIEW_URL', '/media/camera-01.mp4');
    render(<CameraPreview camera={camera} />);
    const video = screen.getByLabelText('Video preview for Camera 01').querySelector('video');
    expect(video).toBeTruthy();
    fireEvent.error(video as HTMLVideoElement);
    expect(screen.getByLabelText('Synthetic preview for Camera 01')).toBeInTheDocument();
  });
});
