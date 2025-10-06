import { NextRequest, NextResponse } from 'next/server';
import { neonClient } from '@/lib/db';
import { executeDbQuery } from '@/lib/dbUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, date, timestamp, totalGB, validCount, invalidCount, duplicateCount, type, entries } = body;

    if (!id || !entries || entries.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prevent bundle-categorizer data from being saved to database
    if (type === 'bundle-categorizer') {
      return NextResponse.json({ error: 'Bundle categorizer data should not be saved to database' }, { status: 400 });
    }

    // Execute database operations with proper error handling
    const result = await executeDbQuery(async () => {
      // Start transaction
      await neonClient`BEGIN`;
      
      try {
        // Insert history entry using neonClient
        await neonClient`
          INSERT INTO history_entries (id, date, timestamp, total_gb, valid_count, invalid_count, duplicate_count, type)
          VALUES (${id}, ${date}, ${timestamp}, ${totalGB}, ${validCount}, ${invalidCount}, ${duplicateCount}, ${type})
          ON CONFLICT (id) DO NOTHING
        `;

        // Insert phone entries
        if (entries.length > 0) {
          // With neonClient, we need to handle batch inserts differently
          // Let's insert entries one by one since the batch syntax is different
          for (const entry of entries) {
            await neonClient`
              INSERT INTO phone_entries (history_entry_id, number, allocation_gb, is_valid, is_duplicate)
              VALUES (${id}, ${entry.number}, ${entry.allocationGB}, ${entry.isValid}, ${entry.isDuplicate})
            `;
          }
        }

        // Commit transaction
        await neonClient`COMMIT`;
        return { success: true };
      } catch (error) {
        // Rollback on error
        await neonClient`ROLLBACK`;
        throw error;
      }
    }, 'Failed to save history');

    // Handle the query result
    if (result.error) {
      return result.response!;
    }

    return NextResponse.json(result.data);
    
  } catch (error) {
    console.error('Error in history save route:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
