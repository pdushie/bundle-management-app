import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';  // Use neon-http adapter
import * as schema from './schema';

// Create Neon SQL client
const sql = neon(process.env.DATABASE_URL!);

// Initialize Drizzle with the Neon client and schema
export const db = drizzle(sql, { schema });
