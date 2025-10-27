'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Loader, CheckCircle } from 'lucide-react';

export default function UpdateEntryCostsPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const updateEntryCosts = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/admin/update-entry-costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update entry costs');
      }
      
      setResult(data);
      toast(`Success! Updated ${data.updatedCount} orders with tier-based pricing`);
    } catch (error) {
      // Console statement removed for security
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Update Entry Costs with Tier Pricing</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tier-Based Entry Costs Update</CardTitle>
          <CardDescription>
            This tool will recalculate all order entry costs based on the correct tier pricing structure
            for each user's assigned pricing profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Use this tool to fix any inconsistent pricing in the system. This will:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Find all orders in the system</li>
            <li>Get the pricing profile assigned to each order's user</li>
            <li>Apply the correct tier-based pricing to each order entry</li>
            <li>Update the total cost of each order</li>
          </ul>
          <p className="text-yellow-600 dark:text-yellow-400">
            <strong>Warning:</strong> This operation may take some time if there are many orders in the system.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={updateEntryCosts} 
            disabled={isUpdating}
            size="lg"
            variant="default"
          >
            {isUpdating ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Updating Entry Costs...
              </>
            ) : (
              'Update All Entry Costs'
            )}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Card className="mb-6 border-red-500">
          <CardHeader className="bg-red-50 dark:bg-red-900/20">
            <CardTitle className="flex items-center text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Update Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Orders Updated</h3>
                <p className="text-2xl font-bold">{result.updatedCount} / {result.totalCount}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Total Entries Updated</h3>
                <p className="text-2xl font-bold">{result.totalEntryCount}</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md mt-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center text-green-700 dark:text-green-300 font-medium mb-2">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Success
                </div>
                <p>{result.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

