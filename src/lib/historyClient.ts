// Client-side wrapper for history operations
import { HistoryEntry, PhoneEntry } from './historyDbOperations';

// Define the return type for getHistoryEntries
type HistoryResponse = {
  historyEntries: HistoryEntry[];
  totalEntries: number;
  phoneEntriesCount: number;
  processedOrderEntriesCount: number;
};

// Get all history entries
export const getHistoryEntries = async (): Promise<HistoryResponse> => {
  try {
    // Try first with /api/history
    let response = await fetch('/api/history', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // If not found, try with /api/history/load as fallback
    if (response.status === 404) {
      response = await fetch('/api/history/load', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    if (!response.ok) {
      throw new Error('Failed to load history entries');
    }

    const data = await response.json();
    return {
      historyEntries: data.historyEntries || [],
      totalEntries: data.totalEntries || 0,
      phoneEntriesCount: data.phoneEntriesCount || 0,
      processedOrderEntriesCount: data.processedOrderEntriesCount || 0
    };
  } catch (error) {
    console.error('Failed to load history entries:', error);
    return {
      historyEntries: [],
      totalEntries: 0,
      phoneEntriesCount: 0,
      processedOrderEntriesCount: 0
    };
  }
};

// Get phone entries for a specific history entry
export const getPhoneEntriesForHistory = async (historyId: string): Promise<PhoneEntry[]> => {
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ historyId }),
    });

    if (!response.ok) {
      throw new Error('Failed to load phone entries');
    }

    const data = await response.json();
    return data.phoneEntries || [];
  } catch (error) {
    console.error('Failed to load phone entries:', error);
    return [];
  }
};
