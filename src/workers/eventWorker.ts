import { isAsyncFunction } from "util/types";
import { pool, query } from "../db";
import { start } from "repl";

export interface EventJob{
  id: string,
  event_id: string,
  status: 'pending' | 'processing' | `completed` | 'failed',
  attempts: number,
  max_attempts: number,
  last_error?: string,
  locked_at?: string,
  scheduled_at: string,
  created_at: string,
  updated_at: string,
}

async function fetchNextJob(): Promise<EventJob | null>{
  const fetch_sql = `
    UPDATE event_jobs 
      SET status = 'processing',
      locked_at = NOW(),
      attempts = attempts + 1,
      updated_at = NOW()
      WHERE id = (
      SELECT id FROM event_jobs
      WHERE status IN ('pending','failed')
        AND scheduled_at <= NOW()
        AND attempts < max_attempts
      ORDER BY scheduled_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
      ) RETURNING *;
    `;
  const result = await query(fetch_sql); 
  if (result.rows.length === 0) {
    return null;
  }

  const job: EventJob = result.rows[0];
  return job;
};

async function markJobComplete(job_id: string) {
  const markCompleteSql = `UPDATE event_jobs SET status = 'completed', updated_at = NOW() WHERE id = ($1);`;
  await query(markCompleteSql, [job_id]);
}

async function markJobFailed(job: EventJob, errorMsg: string) {
  const delaySeconds = Math.pow(2, job.attempts) * 5;
  if (job.attempts >= job.max_attempts) {
    const sql = `
      UPDATE event_jobs 
      SET status = 'failed',
        last_error = $1, 
        updated_at = NOW()
      WHERE id = $2;
      `;
    await query(sql, [errorMsg, job.id]);
  } else {
    const sql = `
      UPDATE event_jobs
      SET status = 'pending',
        scheduled_at = NOW() + ($1 || ' seconds')::INTERVAL,
        last_error = $2,
        updated_at = NOW()
      WHERE id = $3;
    `;
    await query(sql, [delaySeconds.toString(), errorMsg, job.id]);
  }
}

async function processJob(job: EventJob) {
  console.log(`[Event Job Worker] worker is processing job:${job.id} for event:${job.event_id}`);
}

async function start_worker() {
  while (true) {
    console.log(`[Event Job Worker] polling for jobs...`);
    try {
      const job: EventJob | null = await fetchNextJob();
      if (job != null) {
        try {
          await processJob(job);
          await markJobComplete(job.id);
        } catch (err: any) {
          await markJobFailed(job, err.message);
        }
      } else {
        await sleep(2000);
        
      }
    } catch (err: any) {
      console.error(err);
    }
  }
}
  
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

start_worker();