import { NextRequest, NextResponse } from 'next/server';
import { getHistoryEntries, getPhoneEntriesForHistory } from '@/lib/historyDbOperations';
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
    
    return NextResponse.json({ historyEntries });
  } catch (error) {
    console.error('Error in history route:', error);
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
    console.error('Error in history route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve phone entries' },
      { status: 500 }
    );
  }
}
