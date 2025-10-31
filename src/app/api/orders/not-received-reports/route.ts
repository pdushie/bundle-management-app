import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { notReceivedReports } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's not received reports
    const userReports = await db!
      .select({
        id: notReceivedReports.id,
        orderEntryId: notReceivedReports.orderEntryId,
        orderId: notReceivedReports.orderId,
        number: notReceivedReports.number,
        status: notReceivedReports.status,
        reportDate: notReceivedReports.reportDate,
        resolutionDate: notReceivedReports.resolutionDate,
        adminNotes: notReceivedReports.adminNotes,
        evidenceUrl: notReceivedReports.evidenceUrl,
      })
      .from(notReceivedReports)
      .where(eq(notReceivedReports.reportedByUserId, parseInt((session.user as any).id)));

    return NextResponse.json({ 
      success: true, 
      reports: userReports 
    });

  } catch (error) {
    console.error('Error fetching user not received reports:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch not received reports' 
    }, { status: 500 });
  }
}