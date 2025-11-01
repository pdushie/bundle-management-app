import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { neonClient } from "@/lib/db";

// Helper function to check if user has system settings permissions via direct database query
async function hasSystemSettingsPermission(userId: string): Promise<boolean> {
  try {
    const result = await neonClient`
      SELECT p.name 
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ${parseInt(userId)} AND p.name = 'system:settings' AND ur.is_active = true
    `;
    
    return result.length > 0;
  } catch (error) {
    // Console statement removed for security
    return false;
  }
}

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

    // Check if user has system:settings permission
    const userId = (session.user as any).id;
    if (!userId || !(await hasSystemSettingsPermission(userId))) {
      return NextResponse.json(
        { success: false, error: "Forbidden - System settings permission required" }, 
        { status: 403 }
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

// Update system settings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Check if user has system:settings permission
    const userId = (session.user as any).id;
    if (!userId || !(await hasSystemSettingsPermission(userId))) {
      return NextResponse.json(
        { success: false, error: "Forbidden - System settings permission required" }, 
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

