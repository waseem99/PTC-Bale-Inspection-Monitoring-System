import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertBoundary(condition, message) {
  if (!condition) {
    console.error(`[network-boundary] FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function serviceBlock(yaml, serviceName) {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${serviceName}:`);
  if (start < 0) return '';
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [A-Za-z0-9_.-]+:$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function assertNotHostPublished(relativePath, serviceName) {
  const block = serviceBlock(read(relativePath), serviceName);
  assertBoundary(Boolean(block), `${relativePath} must define service '${serviceName}'.`);
  assertBoundary(!/^    ports:/m.test(block), `${relativePath}:${serviceName} must not publish host ports.`);
}

const localComposePath = 'infrastructure/local/docker-compose.local.yml';
const apiComposePath = 'infrastructure/local/docker-compose.api.yml';
const awsComposePath = 'infrastructure/aws/docker-compose.staging.yml';
const localCompose = read(localComposePath);
const apiCompose = read(apiComposePath);

for (const compose of [localComposePath, apiComposePath, awsComposePath]) {
  assertNotHostPublished(compose, 'postgres');
}
assertNotHostPublished(localComposePath, 'api');
assertNotHostPublished(localComposePath, 'dashboard');
assertNotHostPublished(localComposePath, 'edge-spool');
assertNotHostPublished(awsComposePath, 'api');
assertNotHostPublished(awsComposePath, 'dashboard');

assertBoundary(
  localCompose.includes('${LOCAL_BIND_ADDRESS:-127.0.0.1}:${LOCAL_HTTP_PORT:-8080}:80'),
  'Production workstation proxy must bind to loopback by default.',
);
assertBoundary(
  apiCompose.includes('${LOCAL_BIND_ADDRESS:-127.0.0.1}:${DASHBOARD_PORT:-8080}:8080'),
  'Local API harness dashboard must bind to loopback by default.',
);
assertBoundary(
  localCompose.includes('PTC_RUNTIME_MODE: ${PTC_RUNTIME_MODE:-hardware-ready}'),
  'Production workstation edge runtime must default to hardware-ready, not simulator.',
);
assertBoundary(
  localCompose.includes('SIMULATOR_ENABLED: "false"') && apiCompose.includes('SIMULATOR_ENABLED: "false"'),
  'Production API definitions must explicitly disable the application simulator.',
);
assertBoundary(
  /backend:\n\s+driver: bridge\n\s+internal: true/.test(localCompose),
  'Production workstation backend network must remain internal.',
);

const browserBoundaryFiles = [
  'apps/dashboard-web/src/cameraPreviewConfig.ts',
  'apps/dashboard-web/Dockerfile',
  'apps/dashboard-web/Dockerfile.aws',
  'apps/dashboard-web/.env.example',
  'infrastructure/local/docker-compose.video-previews.yml',
  'infrastructure/local/runtime.env.example',
];
const browserBoundary = browserBoundaryFiles.map(read).join('\n');
assertBoundary(
  !/VITE_CAMERA_0[1-4]_PREVIEW_URL/.test(browserBoundary),
  'Per-camera VITE URL variables are forbidden because VITE values are browser-visible.',
);
assertBoundary(
  !/(?:rtsp|rtsps):\/\//i.test(browserBoundary),
  'RTSP/RTSPS addresses must never appear in frontend build/runtime configuration.',
);
assertBoundary(
  !/postgresql:\/\//i.test(browserBoundary),
  'Database connection strings must never appear in frontend build/runtime configuration.',
);

const routeFiles = [
  'apps/platform-api/src/app.ts',
  'apps/platform-api/src/runtime-app.ts',
  'apps/platform-api/src/production-app.ts',
  'apps/platform-api/src/camera-contract-app.ts',
  'apps/platform-api/src/certification-app.ts',
];
const routes = routeFiles.map(read).join('\n');
assertBoundary(
  !/["'`]\/(?:api\/)?(?:debug|simulator)(?:\/|["'`])/i.test(routes),
  'Production API must not expose debug or simulator HTTP routes.',
);

if (process.exitCode) process.exit(process.exitCode);
console.log('[network-boundary] PASS: host exposure, simulator defaults, and browser credential boundaries are hardened.');
