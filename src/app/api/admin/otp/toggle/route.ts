import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerAuthSession();
    
    if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Read current .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { error: 'Could not read environment file' },
        { status: 500 }
      );
    }

    // Parse current OTP setting
    const currentOTPMatch = envContent.match(/^ENABLE_OTP=(.*)$/m);
    const currentOTPValue = currentOTPMatch ? currentOTPMatch[1].trim() : 'true';
    const isCurrentlyEnabled = currentOTPValue.toLowerCase() === 'true';
    
    // Toggle the value
    const newOTPValue = !isCurrentlyEnabled;
    const newOTPLine = `ENABLE_OTP=${newOTPValue}`;

    // Update the environment file
    let newEnvContent;
    if (currentOTPMatch) {
      // Replace existing line
      newEnvContent = envContent.replace(/^ENABLE_OTP=.*$/m, newOTPLine);
    } else {
      // Add new line
      newEnvContent = envContent + '\n' + newOTPLine;
    }

    // Write back to file
    try {
      await fs.writeFile(envPath, newEnvContent, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { error: 'Could not update environment file' },
        { status: 500 }
      );
    }

    // Update process.env for immediate effect
    process.env.ENABLE_OTP = newOTPValue.toString();

    return NextResponse.json({
      success: true,
      enabled: newOTPValue,
      message: `OTP authentication has been ${newOTPValue ? 'enabled' : 'disabled'}`,
      note: 'Changes will take full effect after server restart'
    });
    
  } catch (error) {
    console.error('Error toggling OTP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}