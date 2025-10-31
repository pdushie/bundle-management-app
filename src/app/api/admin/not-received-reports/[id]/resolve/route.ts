import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { notReceivedReports } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { broadcastReportUpdate } from '../../events/route';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise
    const resolvedParams = await params;
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (allow legacy/standard admin role as well)
    if (
      session.user.role !== 'admin' &&
      session.user.role !== 'super_admin' &&
      session.user.role !== 'standard_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const reportId = parseInt(resolvedParams.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const { status, adminNotes, evidenceUrl } = await request.json();

    if (!status || !['resolved', 'confirmed_sent'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be "resolved" or "confirmed_sent"' 
      }, { status: 400 });
    }

    // Update the report
    const [updatedReport] = await db!
      .update(notReceivedReports)
      .set({
        status,
        resolvedByAdminId: parseInt((session.user as any).id),
        resolutionDate: new Date(),
        adminNotes: adminNotes || null,
        evidenceUrl: evidenceUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(notReceivedReports.id, reportId))
      .returning();

    if (!updatedReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Broadcast the update to all connected clients
    broadcastReportUpdate({
      type: 'report_resolved',
      reportId: updatedReport.id,
      status: updatedReport.status,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: `Report ${status === 'resolved' ? 'resolved' : 'confirmed as sent'} successfully`,
      report: updatedReport
    });

  } catch (error) {
    console.error('Error resolving not received report:', error);
    return NextResponse.json({ 
      error: 'Failed to resolve not received report' 
    }, { status: 500 });
  }
}