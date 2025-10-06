import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders as ordersTable } from '@/lib/schema';
import { sql } from 'drizzle-orm';

// Helper function to check if user has admin role
function isAdminUser(session: any) {
  if (!session || !session.user) return false;
  
  // Check for both role property and isAdmin flag for backward compatibility
  return session.user.role === 'admin' || 
         session.user.role === 'superadmin' || 
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
    const date = searchParams.get('date'); // Format: YYYY-MM-DD
    const startDate = searchParams.get('startDate'); // For date range queries
    const endDate = searchParams.get('endDate');

    // If specific date is requested, return detailed daily sales
    if (date) {
      return getDailySalesDetails(date);
    }
    
    // If date range is requested, return sales summary for range
    if (startDate && endDate) {
      return getDailySalesSummary(startDate, endDate);
    }
    
    // Default: return last 30 days of daily sales summary
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date();
    
    return getDailySalesSummary(
      thirtyDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    );

  } catch (error) {
    console.error('Error fetching daily sales:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch daily sales data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Get detailed sales data for a specific date
async function getDailySalesDetails(date: string) {
  try {
    // Parse date as UTC and get UNIX timestamps
    const startTimestamp = new Date(date + 'T00:00:00.000Z').getTime();
    const endTimestamp = new Date(date + 'T23:59:59.999Z').getTime();

    // Query to get all orders for the specified date with user information
    const dailyOrders = await db!.execute(sql`
      SELECT 
        o.id,
        o.timestamp,
        o.date,
        o.time,
        o.user_name,
        o.user_email,
        o.total_data,
        o.total_count,
        o.cost,
        o.estimated_cost,
        o.pricing_profile_name,
        u.name as actual_user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.timestamp >= ${startTimestamp} 
        AND o.timestamp <= ${endTimestamp}
        AND o.date = ${date}
        AND o.status = 'processed'
      ORDER BY o.timestamp DESC
    `);

    const orders = dailyOrders.rows.map((row: any) => ({
      id: row.id,
      timestamp: Number(row.timestamp),
      date: row.date,
      time: row.time,
      userName: row.actual_user_name || row.user_name || row.user_email,
      userEmail: row.user_email,
      totalData: parseFloat(row.total_data || '0'),
      totalCount: Number(row.total_count || 0),
      cost: row.cost ? parseFloat(row.cost) : null,
      estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : null,
      pricingProfileName: row.pricing_profile_name,
      amount: parseFloat(row.cost || row.estimated_cost || '0')
    }));

    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + order.amount, 0);
    const totalData = orders.reduce((sum, order) => sum + order.totalData, 0);
    const totalOrders = orders.length;
    const totalEntries = orders.reduce((sum, order) => sum + order.totalCount, 0);

    // Group by user for user breakdown
    const userSales = orders.reduce((acc, order) => {
      const key = order.userEmail;
      if (!acc[key]) {
        acc[key] = {
          userName: order.userName,
          userEmail: order.userEmail,
          totalSales: 0,
          totalData: 0,
          totalOrders: 0,
          orders: []
        };
      }
      acc[key].totalSales += order.amount;
      acc[key].totalData += order.totalData;
      acc[key].totalOrders += 1;
      acc[key].orders.push(order);
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      date,
      summary: {
        totalSales,
        totalData,
        totalOrders,
        totalEntries
      },
      orders,
      userBreakdown: Object.values(userSales)
    });

  } catch (error) {
    console.error('Error getting daily sales details:', error);
    throw error;
  }
}

// Get sales summary for a date range (daily totals)
async function getDailySalesSummary(startDate: string, endDate: string) {
  try {
    // Parse dates as UTC and get UNIX timestamps
    const startTimestamp = new Date(startDate + 'T00:00:00.000Z').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59.999Z').getTime();

    // Query to get daily sales summary
    const dailySummary = await db!.execute(sql`
      SELECT 
        o.date,
        COUNT(o.id) as total_orders,
        SUM(o.total_count) as total_entries,
        SUM(CAST(o.total_data as DECIMAL)) as total_data,
        SUM(CAST(COALESCE(o.cost, o.estimated_cost, '0') as DECIMAL)) as total_sales,
        COUNT(DISTINCT o.user_email) as unique_users
      FROM orders o
      WHERE o.timestamp >= ${startTimestamp} 
        AND o.timestamp <= ${endTimestamp}
        AND o.status = 'processed'
      GROUP BY o.date
      ORDER BY o.date DESC
    `);

    const dailySales = dailySummary.rows.map((row: any) => ({
      date: row.date,
      totalSales: parseFloat(row.total_sales || '0'),
      totalData: parseFloat(row.total_data || '0'),
      totalOrders: Number(row.total_orders || 0),
      totalEntries: Number(row.total_entries || 0),
      uniqueUsers: Number(row.unique_users || 0)
    }));

    // Calculate grand totals
    const grandTotal = {
      totalSales: dailySales.reduce((sum, day) => sum + day.totalSales, 0),
      totalData: dailySales.reduce((sum, day) => sum + day.totalData, 0),
      totalOrders: dailySales.reduce((sum, day) => sum + day.totalOrders, 0),
      totalEntries: dailySales.reduce((sum, day) => sum + day.totalEntries, 0),
      uniqueUsers: new Set(dailySales.flatMap(day => Array(day.uniqueUsers).fill(0).map((_, i) => `${day.date}-${i}`))).size,
      daysWithSales: dailySales.length
    };

    return NextResponse.json({
      startDate,
      endDate,
      dailySales,
      grandTotal
    });

  } catch (error) {
    console.error('Error getting daily sales summary:', error);
    throw error;
  }
}