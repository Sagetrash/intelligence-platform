import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABSE_URL environment variable is missing.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

//helper function to execute sql queries
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};