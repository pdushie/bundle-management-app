import { NextRequest, NextResponse } from 'next/server';
import { getHistoryEntries, getTotalEntries } from '@/lib/historyDbOperations';
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
    // console.log(`History entries found: ${historyEntries.length}`);
    // console.log(`Total entries: ${totalEntriesData.totalEntries} (phone_entries: ${totalEntriesData.phoneEntriesCount}, processed order_entries: ${totalEntriesData.processedOrderEntriesCount})`);
    
    // Return in a consistent format that the component can use
    return NextResponse.json({ 
      history: historyEntries,
      historyEntries: historyEntries,
      totalEntries: totalEntriesData.totalEntries,
      phoneEntriesCount: totalEntriesData.phoneEntriesCount,
      processedOrderEntriesCount: totalEntriesData.processedOrderEntriesCount
    });
  } catch (error) {
    // console.error('Error in history/load route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve history entries' },
      { status: 500 }
    );
  }
}
