import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { loadConfig } from './config';
import { syncIndexes } from './models';

async function main(): Promise<void> {
  const config = loadConfig();
  await mongoose.connect(config.mongodbUri);
  await syncIndexes();
  const server = http.createServer(createApp(config));
  server.listen(config.port, () => {
    console.log(JSON.stringify({
      level: 'info',
      message: 'PTC platform API started',
      port: config.port,
      environment: config.nodeEnv,
    }));
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ level: 'info', message: 'Shutting down', signal }));
    server.close(async () => {
      await mongoose.disconnect();
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
