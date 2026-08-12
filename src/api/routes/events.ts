import { Router, Request, Response } from 'express';
import { ingestEvent } from '../../services/eventService';
import { error } from 'console';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { source, external_event_id, event_type, payload, occurred_at } = req.body;

    if (!source || !event_type || !payload || !occurred_at) {
      return res.status(400).json({
        error: `Missing required fields: source, event_type, payload. occurred_at`,
      });
    }

    const { event, isDuplicate } = await ingestEvent({
      source,
      external_event_id,
      event_type,
      payload,
      occurred_at,
    });
    if (isDuplicate) {
      return res.status(200).json({
        message: 'Event already ingested. (idompotent)',
        event,
      });
    }
    return res.status(201).json({
      message: `Event ingested successfully.`,
      event,
    });
  } catch (err:any){
    console.error(`[Event Route error]:`, err);
    return res.status(500).json({
      error: `Internal Server Error`,
    });
  }
});

export default router