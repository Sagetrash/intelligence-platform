import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { pool } from './db';

dotenv.config();

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error(`[Database] Connection failed:`, err.message);
  } else {
    console.log(`[Database] Connected successfully at:`, res.rows[0].now);
  }
})
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'context-intelligent-platform',
  });
});

const server = app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`[server] Recieved ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log(`[server] HTTP server shut down.`);
    pool.end(() => {
      console.log(`[Databse] Ending pool.`);
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown(`SIGTERM`));
process.on(`SIGINT`, () => shutdown(`SIGINT`));
