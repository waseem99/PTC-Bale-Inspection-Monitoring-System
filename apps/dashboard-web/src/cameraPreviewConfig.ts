type PreviewEnvironment = {
  VITE_CAMERA_01_PREVIEW_URL?: string;
  VITE_CAMERA_02_PREVIEW_URL?: string;
  VITE_CAMERA_03_PREVIEW_URL?: string;
  VITE_CAMERA_04_PREVIEW_URL?: string;
};

export type CameraPreviewSource = {
  url: string;
  kind: 'video' | 'iframe';
  origin: 'configured' | 'drive-default' | 'local-default';
};

/** Shared Drive camera-angle clips (folder AI Bale Detection). No git media required. */
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

function toPreviewSource(raw: string, origin: CameraPreviewSource['origin']): CameraPreviewSource | undefined {
  const normalized = normalizeCameraPreviewUrl(raw);
  if (!normalized) return undefined;
  const drivePreview = googleDrivePreviewUrl(normalized);
  return {
    url: drivePreview ?? normalized,
    kind: drivePreview ? 'iframe' : 'video',
    origin,
  };
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

  const fromEnv = toPreviewSource(configuredPreview(cameraId, configured) ?? '', 'configured');
  if (fromEnv) return fromEnv;

  const fromDrive = toPreviewSource(driveDefaultByCamera[cameraId] ?? '', 'drive-default');
  if (fromDrive) return fromDrive;

  const localDefault = localPreviewByCamera[cameraId];
  return localDefault ? { url: localDefault, kind: 'video', origin: 'local-default' } : undefined;
}

export function cameraPreviewSource(cameraId: string, environment?: PreviewEnvironment): string | undefined {
  return resolveCameraPreviewSource(cameraId, environment)?.url;
}
