/**
 * GPU Orchestrator
 * Runs on Oracle Cloud (not the GPU machine).
 * Polls Redis queue depths and starts/stops the Vultr GPU instance via the Vultr API.
 * Run via: ts-node orchestrator.ts  (or compile and run as a cronjob every 15 min)
 */

import axios from 'axios';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const VULTR_API_KEY = process.env.VULTR_API_KEY!;
const GPU_INSTANCE_ID = process.env.GPU_INSTANCE_ID!;
const IDLE_SHUTDOWN_MINUTES = parseInt(process.env.GPU_IDLE_SHUTDOWN_MINUTES || '10');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

async function getTotalQueueDepth(): Promise<number> {
  const scanQueue = new Queue('scan-queue', { connection: redis });
  const embedRefQueue = new Queue('embed-ref-queue', { connection: redis });

  const [scanWaiting, scanActive, refWaiting, refActive] = await Promise.all([
    scanQueue.getWaitingCount(),
    scanQueue.getActiveCount(),
    embedRefQueue.getWaitingCount(),
    embedRefQueue.getActiveCount(),
  ]);

  await scanQueue.close();
  await embedRefQueue.close();

  return scanWaiting + scanActive + refWaiting + refActive;
}

async function getGpuInstanceStatus(): Promise<'active' | 'stopped' | 'unknown'> {
  try {
    const res = await axios.get(`https://api.vultr.com/v2/instances/${GPU_INSTANCE_ID}`, {
      headers: { Authorization: `Bearer ${VULTR_API_KEY}` },
    });
    const powerStatus = res.data.instance?.power_status;
    return powerStatus === 'running' ? 'active' : 'stopped';
  } catch (err) {
    console.error('Failed to get GPU instance status:', err.message);
    return 'unknown';
  }
}

async function startGpuInstance(): Promise<void> {
  await axios.post(
    `https://api.vultr.com/v2/instances/${GPU_INSTANCE_ID}/start`,
    {},
    { headers: { Authorization: `Bearer ${VULTR_API_KEY}` } },
  );
  console.log('GPU instance start requested');
}

async function stopGpuInstance(): Promise<void> {
  await axios.post(
    `https://api.vultr.com/v2/instances/${GPU_INSTANCE_ID}/halt`,
    {},
    { headers: { Authorization: `Bearer ${VULTR_API_KEY}` } },
  );
  console.log('GPU instance stop requested');
}

// Track idle start time in Redis
async function getIdleMinutes(): Promise<number> {
  const idleStart = await redis.get('gpu:idle_since');
  if (!idleStart) return 0;
  return Math.floor((Date.now() - parseInt(idleStart)) / 60000);
}

async function setIdleSince(): Promise<void> {
  const existing = await redis.get('gpu:idle_since');
  if (!existing) {
    await redis.set('gpu:idle_since', Date.now().toString());
  }
}

async function clearIdleSince(): Promise<void> {
  await redis.del('gpu:idle_since');
}

async function main() {
  console.log(`GPU Orchestrator running at ${new Date().toISOString()}`);

  const [depth, status] = await Promise.all([getTotalQueueDepth(), getGpuInstanceStatus()]);

  console.log(`Queue depth: ${depth}, GPU status: ${status}`);

  if (depth > 0) {
    // Jobs pending — clear idle timer
    await clearIdleSince();

    if (status === 'stopped') {
      console.log('Jobs waiting, starting GPU instance...');
      await startGpuInstance();
    }
  } else {
    // No jobs
    if (status === 'active') {
      await setIdleSince();
      const idleMinutes = await getIdleMinutes();
      console.log(`GPU idle for ${idleMinutes} minutes`);

      if (idleMinutes >= IDLE_SHUTDOWN_MINUTES) {
        console.log(`Shutting down GPU instance after ${idleMinutes} idle minutes`);
        await stopGpuInstance();
        await clearIdleSince();
      }
    }
  }

  await redis.quit();
}

main().catch((err) => {
  console.error('Orchestrator error:', err);
  process.exit(1);
});
