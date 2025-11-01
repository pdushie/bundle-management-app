import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, orderEntries, notReceivedReports } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { broadcastReportUpdate } from '@/lib/sse/notReceivedReports';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await request.json();
    console.log('Report not received request body:', requestBody);
    
    const { orderEntryId, orderId, number, allocationGb } = requestBody;

    if (!orderEntryId || !orderId || !number || !allocationGb) {
      console.log('Missing fields:', { orderEntryId, orderId, number, allocationGb });
      return NextResponse.json({ 
        error: 'Missing required fields: orderEntryId, orderId, number, allocationGb' 
      }, { status: 400 });
    }

    // Check if user has already reported this order entry as not received
    const existingReport = await db!
      .select()
      .from(notReceivedReports)
      .where(
        and(
          eq(notReceivedReports.orderEntryId, orderEntryId),
          eq(notReceivedReports.reportedByUserId, parseInt((session.user as any).id))
        )
      )
      .limit(1);

    if (existingReport.length > 0) {
      return NextResponse.json({ 
        error: 'You have already reported this number as not received' 
      }, { status: 400 });
    }

    // Create the not received report
    const [report] = await db!
      .insert(notReceivedReports)
      .values({
        orderId,
        orderEntryId,
        number,
        allocationGb,
        reportedByUserId: parseInt((session.user as any).id),
        status: 'pending'
      })
      .returning();

    // Broadcast the new report to all connected admin clients
    broadcastReportUpdate({
      type: 'new_report',
      reportId: report.id,
      number: report.number,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      reportId: report.id,
      message: 'Not received report submitted successfully' 
    });

  } catch (error) {
    console.error('Error creating not received report:', error);
    return NextResponse.json({ 
      error: 'Failed to submit not received report' 
    }, { status: 500 });
  }
}