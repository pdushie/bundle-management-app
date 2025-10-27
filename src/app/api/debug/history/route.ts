import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { historyEntries } from '@/lib/schema';
import { desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    // Console log removed for security

    // Test connection first
    try {
      const testResult = await db.execute(sql`SELECT 1 as test`);
      // Console log removed for security
    } catch (error) {
      // Console statement removed for security
      return NextResponse.json(
        { 
          error: 'Database connection test failed', 
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }

    // Try to count history entries first (less data to transfer)
    try {
      const countResult = await db.select({ count: sql`count(*)` }).from(historyEntries);
      // Console log removed for security
    } catch (error) {
      // Console statement removed for security
      return NextResponse.json(
        { 
          error: 'Failed to count history entries', 
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }

    // Now try to fetch a limited number of entries
    try {
      const entries = await db
        .select()
        .from(historyEntries)
        .orderBy(desc(historyEntries.timestamp))
        .limit(5);
      
      // Console log removed for security
      
      return NextResponse.json({ 
        success: true,
        connectionTest: 'passed',
        countTest: 'passed',
        sampleEntries: entries,
        message: 'Successfully retrieved history entries'
      });
    } catch (error) {
      // Console statement removed for security
      return NextResponse.json(
        { 
          error: 'Failed to fetch history entries', 
          details: error instanceof Error ? error.message : String(error),
          connectionTest: 'passed',
          countTest: 'passed' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to debug history connection', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


