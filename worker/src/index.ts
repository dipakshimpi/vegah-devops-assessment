import { Worker, Job as BullJob } from 'bullmq';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// 1. PostgreSQL Connection Pool
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: process.env.POSTGRES_DB || 'vegah_db',
      },
);

// 2. Redis connection configuration for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// 3. Heartbeat configuration for container healthchecks
const HEARTBEAT_PATH = process.env.HEARTBEAT_PATH || '/tmp/heartbeat';

function writeHeartbeat() {
  try {
    const dir = path.dirname(HEARTBEAT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(HEARTBEAT_PATH, new Date().toISOString(), 'utf-8');
  } catch (err) {
    console.error('Failed to write heartbeat file:', err);
  }
}

// Initial heartbeat and recurring 10-second interval
writeHeartbeat();
const heartbeatInterval = setInterval(writeHeartbeat, 10000);

// 4. Job Processing Logic
async function processJob(job: BullJob<{ jobId: string }>) {
  const { jobId } = job.data;
  console.log(`[Worker] Received job: ${jobId}`);

  try {
    // Set status to 'processing'
    const updateRes = await pool.query(
      `UPDATE jobs SET status = 'processing', "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
      [jobId],
    );

    if (updateRes.rowCount === 0) {
      console.warn(`[Worker] Job ${jobId} not found in database.`);
      return;
    }

    const message: string = updateRes.rows[0].message || '';

    // Simulate work: wait 5 seconds
    console.log(`[Worker] Processing job ${jobId} (simulating 5s work)...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Compute result: uppercase + word count
    const uppercase = message.toUpperCase();
    const trimmed = message.trim();
    const wordCount = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;
    const result = `UPPERCASE: ${uppercase} | Words: ${wordCount}`;

    // Set status to 'completed'
    await pool.query(
      `UPDATE jobs SET status = 'completed', result = $1, "updatedAt" = NOW() WHERE id = $2`,
      [result, jobId],
    );

    console.log(`[Worker] Successfully completed job ${jobId}`);
  } catch (error) {
    console.error(`[Worker] Error processing job ${jobId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await pool.query(
      `UPDATE jobs SET status = 'failed', result = $1, "updatedAt" = NOW() WHERE id = $2`,
      [errorMessage, jobId],
    );
    throw error;
  }
}

// 5. Initialize BullMQ Worker
const worker = new Worker('jobs', processJob, {
  connection: redisConnection,
  concurrency: 2,
});

worker.on('ready', () => {
  console.log('[Worker] Connected to Redis and waiting for jobs on queue "jobs"...');
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err);
});

// 6. Graceful Shutdown
async function shutdown(signal: string) {
  console.log(`[Worker] Received ${signal}. Starting graceful shutdown...`);
  clearInterval(heartbeatInterval);

  try {
    await worker.close();
    await pool.end();
    console.log('[Worker] Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('[Worker] Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

