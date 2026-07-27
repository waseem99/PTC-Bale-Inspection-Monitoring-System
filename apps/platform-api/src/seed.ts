import mongoose from 'mongoose';
import { loadConfig } from './config';
import { resetSyntheticData, seedStatus, seedSyntheticData } from './seed-service';

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'seed';
  const config = loadConfig();
  await mongoose.connect(config.mongodbUri);
  try {
    if (command === 'reset') console.log(JSON.stringify(await seedSyntheticData(config, true)));
    else if (command === 'seed') console.log(JSON.stringify(await seedSyntheticData(config, false)));
    else if (command === 'status') console.log(JSON.stringify(await seedStatus()));
    else if (command === 'clear') {
      await resetSyntheticData(config);
      console.log(JSON.stringify({ cleared: true }));
    } else throw new Error(`Unknown seed command: ${command}`);
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
