import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { notReceivedReports, orders, orderEntries, users } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
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

    // Fetch all not received reports with related data
    const reports = await db!
      .select({
        id: notReceivedReports.id,
        orderId: notReceivedReports.orderId,
        orderEntryId: notReceivedReports.orderEntryId,
        number: notReceivedReports.number,
        allocationGb: notReceivedReports.allocationGb,
        reportDate: notReceivedReports.reportDate,
        status: notReceivedReports.status,
        adminNotes: notReceivedReports.adminNotes,
        evidenceUrl: notReceivedReports.evidenceUrl,
        resolutionDate: notReceivedReports.resolutionDate,
        // Order details
        orderDate: orders.date,
        orderTime: orders.time,
        processedAt: orders.processedAt,
        orderStatus: orders.status,
        // User details
        reportedByName: users.name,
        reportedByEmail: users.email,
        // Admin details (if resolved)
        resolvedByName: users.name,
      })
      .from(notReceivedReports)
      .leftJoin(orders, eq(notReceivedReports.orderId, orders.id))
      .leftJoin(orderEntries, eq(notReceivedReports.orderEntryId, orderEntries.id))
      .leftJoin(users, eq(notReceivedReports.reportedByUserId, users.id))
      .orderBy(desc(notReceivedReports.reportDate));

    return NextResponse.json({ 
      success: true, 
      reports
    });

  } catch (error) {
    console.error('Error fetching not received reports:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch not received reports' 
    }, { status: 500 });
  }
}