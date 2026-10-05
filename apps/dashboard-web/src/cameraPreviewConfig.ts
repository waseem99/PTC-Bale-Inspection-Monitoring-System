type PreviewEnvironment = {
  VITE_CAMERA_PREVIEW_MODE?: 'drive' | 'local';
};

export type CameraPreviewSource = {
  url: string;
  kind: 'video' | 'iframe';
  origin: 'drive-default' | 'local-default';
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

function selectedPreviewMode(environment?: PreviewEnvironment): 'drive' | 'local' {
  const configured = environment?.VITE_CAMERA_PREVIEW_MODE ?? import.meta.env.VITE_CAMERA_PREVIEW_MODE;
  return configured === 'local' ? 'local' : 'drive';
}

export function resolveCameraPreviewSource(cameraId: string, environment?: PreviewEnvironment): CameraPreviewSource | undefined {
  if (selectedPreviewMode(environment) === 'local') {
    const localDefault = localPreviewByCamera[cameraId];
    return localDefault ? { url: localDefault, kind: 'video', origin: 'local-default' } : undefined;
  }

  const drivePreview = googleDrivePreviewUrl(driveDefaultByCamera[cameraId] ?? '');
  return drivePreview ? { url: drivePreview, kind: 'iframe', origin: 'drive-default' } : undefined;
}

export function cameraPreviewSource(cameraId: string, environment?: PreviewEnvironment): string | undefined {
  return resolveCameraPreviewSource(cameraId, environment)?.url;
}
