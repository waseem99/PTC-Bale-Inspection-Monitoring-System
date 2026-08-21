type PreviewEnvironment = {
  VITE_CAMERA_01_PREVIEW_URL?: string;
  VITE_CAMERA_02_PREVIEW_URL?: string;
  VITE_CAMERA_03_PREVIEW_URL?: string;
  VITE_CAMERA_04_PREVIEW_URL?: string;
};

export type CameraPreviewSource = {
  url: string;
  kind: 'video' | 'iframe';
  origin: 'configured' | 'local-default';
};

const localPreviewByCamera: Record<string, string> = {
  'CAM-01': '/media/camera-01.mp4',
  'CAM-02': '/media/camera-02.mp4',
  'CAM-03': '/media/camera-03.mp4',
  'CAM-04': '/media/camera-04.mp4',
};

export function normalizeCameraPreviewUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function googleDrivePreviewUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value, 'https://ptc.local');
    if (parsed.hostname !== 'drive.google.com') return undefined;
    const match = parsed.pathname.match(/^\/file\/d\/([^/]+)\/(?:view|preview)?/);
    if (!match?.[1]) return undefined;
    return `https://drive.google.com/file/d/${encodeURIComponent(match[1])}/preview`;
  } catch {
    return undefined;
  }
}

function configuredPreview(cameraId: string, environment: PreviewEnvironment): string | undefined {
  return cameraId === 'CAM-01' ? environment.VITE_CAMERA_01_PREVIEW_URL
    : cameraId === 'CAM-02' ? environment.VITE_CAMERA_02_PREVIEW_URL
      : cameraId === 'CAM-03' ? environment.VITE_CAMERA_03_PREVIEW_URL
        : cameraId === 'CAM-04' ? environment.VITE_CAMERA_04_PREVIEW_URL
          : undefined;
}

export function resolveCameraPreviewSource(cameraId: string, environment?: PreviewEnvironment): CameraPreviewSource | undefined {
  const configured: PreviewEnvironment = environment ?? {
    VITE_CAMERA_01_PREVIEW_URL: import.meta.env.VITE_CAMERA_01_PREVIEW_URL,
    VITE_CAMERA_02_PREVIEW_URL: import.meta.env.VITE_CAMERA_02_PREVIEW_URL,
    VITE_CAMERA_03_PREVIEW_URL: import.meta.env.VITE_CAMERA_03_PREVIEW_URL,
    VITE_CAMERA_04_PREVIEW_URL: import.meta.env.VITE_CAMERA_04_PREVIEW_URL,
  };

  const normalized = normalizeCameraPreviewUrl(configuredPreview(cameraId, configured));
  if (normalized) {
    const drivePreview = googleDrivePreviewUrl(normalized);
    return {
      url: drivePreview ?? normalized,
      kind: drivePreview ? 'iframe' : 'video',
      origin: 'configured',
    };
  }

  const localDefault = localPreviewByCamera[cameraId];
  return localDefault ? { url: localDefault, kind: 'video', origin: 'local-default' } : undefined;
}

export function cameraPreviewSource(cameraId: string, environment?: PreviewEnvironment): string | undefined {
  return resolveCameraPreviewSource(cameraId, environment)?.url;
}
