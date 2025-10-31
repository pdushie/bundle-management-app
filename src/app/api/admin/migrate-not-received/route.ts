import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });

    await client.connect();
    console.log('Connected to database for migration');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', 'add-not-received-reports.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(sql);
    
    await client.end();

    console.log('Migration completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Not received reports table created successfully' 
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}