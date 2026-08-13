type PreviewEnvironment = {
  VITE_CAMERA_01_PREVIEW_URL?: string;
  VITE_CAMERA_02_PREVIEW_URL?: string;
  VITE_CAMERA_03_PREVIEW_URL?: string;
  VITE_CAMERA_04_PREVIEW_URL?: string;
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

export function cameraPreviewSource(cameraId: string, environment?: PreviewEnvironment): string | undefined {
  const configured: PreviewEnvironment = environment ?? {
    VITE_CAMERA_01_PREVIEW_URL: import.meta.env.VITE_CAMERA_01_PREVIEW_URL,
    VITE_CAMERA_02_PREVIEW_URL: import.meta.env.VITE_CAMERA_02_PREVIEW_URL,
    VITE_CAMERA_03_PREVIEW_URL: import.meta.env.VITE_CAMERA_03_PREVIEW_URL,
    VITE_CAMERA_04_PREVIEW_URL: import.meta.env.VITE_CAMERA_04_PREVIEW_URL,
  };
  const raw = cameraId === 'CAM-01' ? configured.VITE_CAMERA_01_PREVIEW_URL
    : cameraId === 'CAM-02' ? configured.VITE_CAMERA_02_PREVIEW_URL
      : cameraId === 'CAM-03' ? configured.VITE_CAMERA_03_PREVIEW_URL
        : cameraId === 'CAM-04' ? configured.VITE_CAMERA_04_PREVIEW_URL
          : undefined;
  return normalizeCameraPreviewUrl(raw);
}
