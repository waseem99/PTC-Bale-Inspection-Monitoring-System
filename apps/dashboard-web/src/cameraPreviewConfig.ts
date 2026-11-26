type PreviewEnvironment = {
  VITE_CAMERA_PREVIEW_MODE?: 'drive' | 'local' | 'live';
};

export type CameraPreviewSource = {
  url: string;
  kind: 'video' | 'iframe' | 'mjpeg';
  origin: 'drive-default' | 'local-default' | 'live-ai';
};

/** Shared Drive camera-angle clips (folder AI Bale Detection). Public preview media only. */
const driveDefaultByCamera: Record<string, string> = {
  'CAM-01': 'https://drive.google.com/file/d/1Upew9D7Ypwn0FOsmJRxbSiylwjQGb240/view',
  'CAM-02': 'https://drive.google.com/file/d/1154WOX30kN0Mk9rvyJeZv4cVYQbW6R7_/view',
  'CAM-03': 'https://drive.google.com/file/d/1B-MSezkRrFX4aLDHz4JNS3duvCGwtv0C/view',
  'CAM-04': 'https://drive.google.com/file/d/1KHKi4dnOGoIT4rahSD07ASXQLbd8jQMz/view',
};

const localPreviewByCamera: Record<string, string> = {
  'CAM-01': '/media/camera-01.mp4',
  'CAM-02': '/media/camera-02.mp4',
  'CAM-03': '/media/camera-03.mp4',
  'CAM-04': '/media/camera-04.mp4',
};

/** Realtime YOLO MJPEG from services/ai-inference/scripts/live_mjpeg_server.py (proxied). */
const livePreviewByCamera: Record<string, string> = {
  'CAM-01': '/live-ai/stream/CAM-01',
  'CAM-02': '/live-ai/stream/CAM-02',
  'CAM-03': '/live-ai/stream/CAM-03',
  'CAM-04': '/live-ai/stream/CAM-04',
};

function googleDrivePreviewUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value, 'https://ptc.local');
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'drive.google.com' || parsed.username || parsed.password) {
      return undefined;
    }
    const match = parsed.pathname.match(/^\/file\/d\/([^/]+)\/(?:view|preview)?/);
    if (!match?.[1]) return undefined;
    return `https://drive.google.com/file/d/${encodeURIComponent(match[1])}/preview`;
  } catch {
    return undefined;
  }
}

function selectedPreviewMode(environment?: PreviewEnvironment): 'drive' | 'local' | 'live' {
  const configured = environment?.VITE_CAMERA_PREVIEW_MODE ?? import.meta.env.VITE_CAMERA_PREVIEW_MODE;
  if (configured === 'live') return 'live';
  if (configured === 'local') return 'local';
  return 'drive';
}

export function resolveCameraPreviewSource(cameraId: string, environment?: PreviewEnvironment): CameraPreviewSource | undefined {
  const mode = selectedPreviewMode(environment);
  if (mode === 'live') {
    const live = livePreviewByCamera[cameraId];
    return live ? { url: live, kind: 'mjpeg', origin: 'live-ai' } : undefined;
  }
  if (mode === 'local') {
    const localDefault = localPreviewByCamera[cameraId];
    return localDefault ? { url: localDefault, kind: 'video', origin: 'local-default' } : undefined;
  }

  const drivePreview = googleDrivePreviewUrl(driveDefaultByCamera[cameraId] ?? '');
  return drivePreview ? { url: drivePreview, kind: 'iframe', origin: 'drive-default' } : undefined;
}

export function cameraPreviewSource(cameraId: string, environment?: PreviewEnvironment): string | undefined {
  return resolveCameraPreviewSource(cameraId, environment)?.url;
}
