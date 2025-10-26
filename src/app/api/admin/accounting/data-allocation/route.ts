import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Helper function to check if user has admin role
function isAdminUser(session: any) {
  if (!session || !session.user) return false;
  
  // Check for admin roles including standard_admin
  return session.user.role === 'admin' || 
         session.user.role === 'super_admin' || 
         session.user.role === 'standard_admin' ||
         session.user.isAdmin === true;
}

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    // Get session to check if user is admin
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdminUser(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Default to last 30 days if no dates provided
    let start = startDate;
    let end = endDate;
    
    if (!start || !end) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      start = thirtyDaysAgo.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    }

    // Parse dates as UTC and get UNIX timestamps
    const startTimestamp = new Date(start + 'T00:00:00.000Z').getTime();
    const endTimestamp = new Date(end + 'T23:59:59.999Z').getTime();

    // Get daily data allocation from orders (order system)
    const orderSystemData = await db!.execute(sql`
      SELECT 
        o.date,
        SUM(CAST(o.total_data as DECIMAL)) as total_data_gb,
        COUNT(o.id) as total_orders,
        SUM(o.total_count) as total_entries,
        'order_system' as source
      FROM orders o
      WHERE o.timestamp >= ${startTimestamp} 
        AND o.timestamp <= ${endTimestamp}
        AND o.status = 'processed'
      GROUP BY o.date
      ORDER BY o.date DESC
    `);

    // Get daily data allocation from history entries (bundle allocator)
    const bundleAllocatorData = await db!.execute(sql`
      SELECT 
        h.date,
        SUM(CAST(h.total_gb as DECIMAL)) as total_data_gb,
        COUNT(h.id) as total_orders,
        SUM(h.valid_count + h.invalid_count + h.duplicate_count) as total_entries,
        'bundle_allocator' as source
      FROM history_entries h
      WHERE h.timestamp >= ${startTimestamp} 
        AND h.timestamp <= ${endTimestamp}
        AND h.type = 'bundle-allocator'
      GROUP BY h.date
      ORDER BY h.date DESC
    `);

    // Combine and format the data
    const dataMap = new Map();

    // Process order system data
    orderSystemData.rows.forEach((row: any) => {
      const date = row.date;
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          orderSystem: {
            totalDataGB: 0,
            totalOrders: 0,
            totalEntries: 0
          },
          bundleAllocator: {
            totalDataGB: 0,
            totalOrders: 0,
            totalEntries: 0
          }
        });
      }
      
      const dayData = dataMap.get(date);
      dayData.orderSystem = {
        totalDataGB: parseFloat(row.total_data_gb || '0'),
        totalOrders: Number(row.total_orders || 0),
        totalEntries: Number(row.total_entries || 0)
      };
    });

    // Process bundle allocator data
    bundleAllocatorData.rows.forEach((row: any) => {
      const date = row.date;
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          orderSystem: {
            totalDataGB: 0,
            totalOrders: 0,
            totalEntries: 0
          },
          bundleAllocator: {
            totalDataGB: 0,
            totalOrders: 0,
            totalEntries: 0
          }
        });
      }
      
      const dayData = dataMap.get(date);
      dayData.bundleAllocator = {
        totalDataGB: parseFloat(row.total_data_gb || '0'),
        totalOrders: Number(row.total_orders || 0),
        totalEntries: Number(row.total_entries || 0)
      };
    });

    // Convert map to array and calculate totals
    const dailyData = Array.from(dataMap.values()).map(day => ({
      ...day,
      totalDataGB: day.orderSystem.totalDataGB + day.bundleAllocator.totalDataGB,
      totalOrders: day.orderSystem.totalOrders + day.bundleAllocator.totalOrders,
      totalEntries: day.orderSystem.totalEntries + day.bundleAllocator.totalEntries
    }));

    // Calculate summary statistics
    const summary = {
      orderSystem: {
        totalDataGB: dailyData.reduce((sum, day) => sum + day.orderSystem.totalDataGB, 0),
        totalOrders: dailyData.reduce((sum, day) => sum + day.orderSystem.totalOrders, 0),
        totalEntries: dailyData.reduce((sum, day) => sum + day.orderSystem.totalEntries, 0),
        avgDailyDataGB: 0,
        daysActive: dailyData.filter(day => day.orderSystem.totalOrders > 0).length
      },
      bundleAllocator: {
        totalDataGB: dailyData.reduce((sum, day) => sum + day.bundleAllocator.totalDataGB, 0),
        totalOrders: dailyData.reduce((sum, day) => sum + day.bundleAllocator.totalOrders, 0),
        totalEntries: dailyData.reduce((sum, day) => sum + day.bundleAllocator.totalEntries, 0),
        avgDailyDataGB: 0,
        daysActive: dailyData.filter(day => day.bundleAllocator.totalOrders > 0).length
      },
      combined: {
        totalDataGB: dailyData.reduce((sum, day) => sum + day.totalDataGB, 0),
        totalOrders: dailyData.reduce((sum, day) => sum + day.totalOrders, 0),
        totalEntries: dailyData.reduce((sum, day) => sum + day.totalEntries, 0),
        avgDailyDataGB: 0,
        totalDays: dailyData.length
      }
    };

    // Calculate averages
    summary.orderSystem.avgDailyDataGB = summary.orderSystem.daysActive > 0 
      ? summary.orderSystem.totalDataGB / summary.orderSystem.daysActive 
      : 0;
    
    summary.bundleAllocator.avgDailyDataGB = summary.bundleAllocator.daysActive > 0 
      ? summary.bundleAllocator.totalDataGB / summary.bundleAllocator.daysActive 
      : 0;
    
    summary.combined.avgDailyDataGB = summary.combined.totalDays > 0 
      ? summary.combined.totalDataGB / summary.combined.totalDays 
      : 0;

    return NextResponse.json({
      startDate: start,
      endDate: end,
      dailyData: dailyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      summary
    });

  } catch (error) {
    console.error('Error fetching data allocation stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data allocation statistics',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}