import { NextRequest, NextResponse } from 'next/server';
import { getHistoryEntries, getPhoneEntriesForHistory, getTotalEntries } from '@/lib/historyDbOperations';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get the session to check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get history entries
    const historyEntries = await getHistoryEntries();
    
    // Get total entries count (phone_entries + processed order_entries)
    const totalEntriesData = await getTotalEntries();
    
    // Log the result for debugging
    // Console log removed for security
    // Console log removed for security
    
    // Return in a consistent format that the component can use
    return NextResponse.json({ 
      history: historyEntries,
      historyEntries: historyEntries,
      totalEntries: totalEntriesData.totalEntries,
      phoneEntriesCount: totalEntriesData.phoneEntriesCount,
      processedOrderEntriesCount: totalEntriesData.processedOrderEntriesCount
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to retrieve history entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the session to check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { historyId } = data;
    
    if (!historyId) {
      return NextResponse.json(
        { error: 'History ID is required' },
        { status: 400 }
      );
    }
    
    // Get phone entries for the specified history
    const phoneEntries = await getPhoneEntriesForHistory(historyId);
    
    return NextResponse.json({ phoneEntries });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to retrieve phone entries' },
      { status: 500 }
    );
  }
}


