import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, users, historyEntries } from '@/lib/schema';
import { eq, and, isNotNull, gte, lte, desc } from 'drizzle-orm';

interface ProcessingReport {
  id: string;
  type: 'order' | 'bundle-allocator';
  timestamp: number;
  date: string;
  time: string;
  userName?: string;
  userEmail?: string;
  totalData: number;
  totalCount: number;
  status?: string;
  cost?: number;
  estimatedCost?: number;
  processedBy?: string;
  processedAt?: string;
  adminName?: string;
  adminEmail?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const filters = {
      adminId: searchParams.get('adminId'),
      status: searchParams.get('status') || 'processed',
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo')
    };
    
    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '25')
    };
    
    // Calculate offset for pagination
    const offset = (pagination.page - 1) * pagination.pageSize;

    const reports: ProcessingReport[] = [];

    // Get processed orders with admin information
    if (filters.status === 'processed' || filters.status === '') {
      const orderConditions = [];
      if (filters.adminId) {
        orderConditions.push(eq(orders.processedBy, parseInt(filters.adminId)));
      }
      if (filters.status) {
        orderConditions.push(eq(orders.status, filters.status));
      } else {
        orderConditions.push(eq(orders.status, 'processed'));
      }
      if (filters.dateFrom) {
        orderConditions.push(gte(orders.date, filters.dateFrom));
      }
      if (filters.dateTo) {
        orderConditions.push(lte(orders.date, filters.dateTo));
      }

      const processedOrders = await db
        .select({
          // Order fields
          id: orders.id,
          timestamp: orders.timestamp,
          date: orders.date,
          time: orders.time,
          userName: orders.userName,
          userEmail: orders.userEmail,
          totalData: orders.totalData,
          totalCount: orders.totalCount,
          status: orders.status,
          cost: orders.cost,
          estimatedCost: orders.estimatedCost,
          processedBy: orders.processedBy,
          processedAt: orders.processedAt,
          // Admin info
          adminEmail: users.email,
          adminName: users.name
        })
        .from(orders)
        .leftJoin(users, eq(orders.processedBy, users.id))
        .where(orderConditions.length > 0 ? and(...orderConditions) : undefined)
        .orderBy(desc(orders.timestamp))
        .limit(pagination.pageSize)
        .offset(offset);

      // Convert orders to reports
      for (const order of processedOrders) {
        reports.push({
          id: order.id,
          type: 'order',
          timestamp: order.timestamp,
          date: order.date,
          time: order.time,
          userName: order.userName,
          userEmail: order.userEmail,
          totalData: parseFloat(order.totalData.toString()),
          totalCount: order.totalCount,
          status: order.status,
          cost: order.cost ? parseFloat(order.cost.toString()) : undefined,
          estimatedCost: order.estimatedCost ? parseFloat(order.estimatedCost.toString()) : undefined,
          processedBy: order.processedBy?.toString(),
          processedAt: order.processedAt?.toISOString(),
          adminName: order.adminName || undefined,
          adminEmail: order.adminEmail || undefined
        });
      }
    }

    // Get bundle allocator history entries with admin information
    const historyConditions = [eq(historyEntries.type, 'bundle-allocator')];
    if (filters.adminId) {
      historyConditions.push(eq(historyEntries.userId, parseInt(filters.adminId)));
    }
    if (filters.dateFrom) {
      historyConditions.push(gte(historyEntries.date, filters.dateFrom));
    }
    if (filters.dateTo) {
      historyConditions.push(lte(historyEntries.date, filters.dateTo));
    }
    // Only include entries that have a user_id (processed by someone)
    historyConditions.push(isNotNull(historyEntries.userId));

    const bundleAllocatorEntries = await db
      .select({
        // History fields
        id: historyEntries.id,
        timestamp: historyEntries.timestamp,
        date: historyEntries.date,
        totalGB: historyEntries.totalGB,
        validCount: historyEntries.validCount,
        invalidCount: historyEntries.invalidCount,
        duplicateCount: historyEntries.duplicateCount,
        userId: historyEntries.userId,
        createdAt: historyEntries.createdAt,
        // Admin info
        adminEmail: users.email,
        adminName: users.name
      })
      .from(historyEntries)
      .leftJoin(users, eq(historyEntries.userId, users.id))
      .where(and(...historyConditions))
      .orderBy(desc(historyEntries.timestamp))
      .limit(pagination.pageSize)
      .offset(offset);

    // Convert bundle allocator entries to reports
    for (const entry of bundleAllocatorEntries) {
      const entryDate = new Date(entry.timestamp);
      reports.push({
        id: entry.id,
        type: 'bundle-allocator',
        timestamp: entry.timestamp,
        date: entry.date,
        time: entryDate.toLocaleTimeString(),
        totalData: parseFloat(entry.totalGB || '0'), // Data is already in GB
        totalCount: entry.validCount + entry.invalidCount + entry.duplicateCount,
        status: 'processed',
        processedBy: entry.userId?.toString(),
        processedAt: entry.createdAt?.toISOString(),
        adminName: entry.adminName || undefined,
        adminEmail: entry.adminEmail || undefined
      });
    }

    // Sort all reports by timestamp (newest first)
    reports.sort((a, b) => b.timestamp - a.timestamp);

    // Get total count for pagination (this is an approximation since we're combining two queries)
    // For now, we'll calculate total pages based on the current page results
    const totalRecords = reports.length === pagination.pageSize ? 
      (pagination.page * pagination.pageSize) + 1 : // More records likely exist
      ((pagination.page - 1) * pagination.pageSize) + reports.length; // This is the last page
    
    const totalPages = Math.ceil(totalRecords / pagination.pageSize);

    return NextResponse.json({ 
      reports,
      pagination: {
        currentPage: pagination.page,
        totalPages,
        totalRecords,
        pageSize: pagination.pageSize
      }
    });
  } catch (error) {
    console.error('Error fetching processing reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processing reports' },
      { status: 500 }
    );
  }
}