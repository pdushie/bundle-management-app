import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a connection pool directly using pg (bypassing Drizzle)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { id, date, timestamp, totalGB, validCount, invalidCount, duplicateCount, type, entries } = body;

    if (!id || !entries || entries.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Insert history entry using raw SQL
    await client.query(
      `INSERT INTO history_entries (id, date, timestamp, total_gb, valid_count, invalid_count, duplicate_count, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [id, date, timestamp, totalGB, validCount, invalidCount, duplicateCount, type]
    );

    // Insert phone entries in batch
    if (entries.length > 0) {
      const phoneValues = entries.map((entry: any, index: number) => {
        const baseIndex = index * 5;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`;
      }).join(', ');

      const phoneParams = entries.flatMap((entry: any) => [
        id, // historyEntryId
        entry.number,
        entry.allocationGB,
        entry.isValid,
        entry.isDuplicate
      ]);

      await client.query(
        `INSERT INTO phone_entries (history_entry_id, number, allocation_gb, is_valid, is_duplicate)
         VALUES ${phoneValues}`,
        phoneParams
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    return NextResponse.json({ 
      error: 'Failed to save history', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}
