import http from 'node:http';
import { createApp } from './app';
import { loadConfig } from './config';
import { connectDatabase, disconnectDatabase } from './db';

async function main(): Promise<void> {
  const config = loadConfig();
  await connectDatabase();
  const server = http.createServer(createApp(config));
  server.listen(config.port, () => {
    console.log(JSON.stringify({
      level: 'info',
      message: 'PTC platform API started',
      port: config.port,
      environment: config.nodeEnv,
      database: 'postgresql',
    }));
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ level: 'info', message: 'Shutting down', signal }));
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
