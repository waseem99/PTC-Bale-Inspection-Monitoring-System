import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraPreview } from './cameraPreview';
import { cameraPreviewSource } from './cameraPreviewConfig';
import type { Camera } from './types';

const camera: Camera = {
  id: 'CAM-01', name: 'Camera 01', zone: 'Bale Entry', status: 'online', aiStatus: 'processing',
  lastFrameAt: new Date().toISOString(), fps: 18, streamQuality: '1080p', todayEvents: 1,
};

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe('camera preview', () => {
  it('maps a configured preview to the matching camera', () => {
    vi.stubEnv('VITE_CAMERA_01_PREVIEW_URL', '/media/camera-01.mp4');
    expect(cameraPreviewSource('CAM-01')).toBe('/media/camera-01.mp4');
    expect(cameraPreviewSource('CAM-02')).toBeUndefined();
  });

  it('renders configured media', () => {
    vi.stubEnv('VITE_CAMERA_01_PREVIEW_URL', '/media/camera-01.mp4');
    render(<CameraPreview camera={camera} />);
    expect(screen.getByLabelText('Video preview for Camera 01').querySelector('video')).toBeTruthy();
  });

  it('uses the existing synthetic fallback when no media is configured', () => {
    render(<CameraPreview camera={camera} />);
    expect(screen.getByLabelText('Synthetic preview for Camera 01')).toBeInTheDocument();
  });
});
