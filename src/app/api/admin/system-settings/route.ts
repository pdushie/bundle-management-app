import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { neonClient } from "@/lib/db";

// Get system settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Get system settings
    const settings = await neonClient`
      SELECT key, value, description
      FROM system_settings
      ORDER BY key
    `;
    
    // Convert to key-value object
    const settingsObject = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = {
        value: setting.value,
        description: setting.description
      };
      return acc;
    }, {});
    
    return NextResponse.json({ 
      success: true, 
      settings: settingsObject
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { success: false, error: "Failed to fetch system settings" }, 
      { status: 500 }
    );
  }
}

// Update system settings (super admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Only super_admin can update system settings
    if (session.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden - Super admin access required" }, 
        { status: 403 }
      );
    }

    const body = await req.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: "Key and value are required" },
        { status: 400 }
      );
    }

    // Update the setting
    const result = await neonClient`
      UPDATE system_settings 
      SET value = ${value}, updated_at = CURRENT_TIMESTAMP
      WHERE key = ${key}
      RETURNING key, value, description
    `;
    
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Setting not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      setting: {
        key: result[0].key,
        value: result[0].value,
        description: result[0].description
      }
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { success: false, error: "Failed to update system setting" }, 
      { status: 500 }
    );
  }
}

