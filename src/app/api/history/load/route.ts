import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  const client = await pool.connect();
  
  try {
    // Get all history entries with their phone entries
    const result = await client.query(`
      SELECT 
        he.id,
        he.date,
        he.timestamp,
        he.total_gb,
        he.valid_count,
        he.invalid_count,
        he.duplicate_count,
        he.type,
        pe.number,
        pe.allocation_gb,
        pe.is_valid,
        pe.is_duplicate
      FROM history_entries he
      LEFT JOIN phone_entries pe ON he.id = pe.history_entry_id
      ORDER BY he.timestamp DESC
    `);

    // Group the results by history entry
    const historyMap = new Map();
    
    result.rows.forEach(row => {
      const historyId = row.id;
      
      if (!historyMap.has(historyId)) {
        historyMap.set(historyId, {
          id: row.id,
          date: row.date,
          timestamp: parseInt(row.timestamp),
          totalGB: parseFloat(row.total_gb || '0'),
          validCount: row.valid_count || 0,
          invalidCount: row.invalid_count || 0,
          duplicateCount: row.duplicate_count || 0,
          type: row.type,
          entries: []
        });
      }

      // Add phone entry if it exists
      if (row.number) {
        historyMap.get(historyId).entries.push({
          number: row.number,
          allocationGB: parseFloat(row.allocation_gb || '0'),
          isValid: row.is_valid,
          isDuplicate: row.is_duplicate
        });
      }
    });

    const history = Array.from(historyMap.values());
    return NextResponse.json({ history });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to load history' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
