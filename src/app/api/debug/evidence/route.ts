import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { notReceivedReports } from '@/lib/schema';
import { isNotNull } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if database is available
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Get all reports with evidence URLs
    const reports = await db
      .select()
      .from(notReceivedReports)
      .where(isNotNull(notReceivedReports.evidenceUrl));

    return NextResponse.json({ 
      reports: reports.map((report: any) => ({
        id: report.id,
        status: report.status,
        evidenceUrl: report.evidenceUrl,
        orderEntryId: report.orderEntryId,
        number: report.number
      }))
    });

  } catch (error) {
    console.error('Error fetching evidence debug info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}