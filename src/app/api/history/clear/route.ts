import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function DELETE() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete phone entries first (due to foreign key constraint)
    await client.query('DELETE FROM phone_entries');
    
    // Delete history entries
    await client.query('DELETE FROM history_entries');
    
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    await client.query('ROLLBACK');
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to clear history' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

