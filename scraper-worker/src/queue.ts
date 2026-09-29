// scraper-worker/src/queue.ts
import { Queue } from 'bullmq';
import { connection } from './lib/redis';

export const monitorQueue = new Queue('check-monitor', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: true,
  },
});