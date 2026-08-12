import { query } from "../db";

export interface CreateEventInput {
  source: string;
  external_event_id?: string;
  event_type: string;
  payload: Record<string, any>;
  occurred_at: string;
}

export interface IngestEventResult {
  event: any;
  isDuplicate: boolean;
}

export async function ingestEvent(input: CreateEventInput): Promise<IngestEventResult> {
  const { source, external_event_id, event_type, payload, occurred_at } = input;
  const insertSql = `
    INSERT INTO events (source,external_event_id,event_type,payload,occurred_at)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (source, external_event_id) DO NOTHING
    RETURNING *;
    `;
  const result = await query(insertSql, [
    source,
    external_event_id,
    event_type,
    payload,
    occurred_at,
  ]);
  if (result.rows.length === 0 && external_event_id) {
    const existing = await query(
      `SELECT * FROM events WHERE source = $1 AND external_event_id = $2;`, [source, external_event_id]
    );
    return { event: existing.rows[0], isDuplicate: true };
  }
  return { event: result.rows[0], isDuplicate: false };
}