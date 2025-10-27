import { NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/db";

// Get order halt status (public endpoint)
export async function GET(req: NextRequest) {
  try {
    // Get orders halt settings
    const settings = await neonClient`
      SELECT key, value
      FROM system_settings
      WHERE key IN ('orders_halted', 'orders_halt_message')
    `;
    
    const ordersHalted = settings.find(s => s.key === 'orders_halted')?.value === 'true';
    const haltMessage = settings.find(s => s.key === 'orders_halt_message')?.value || 'Order processing is temporarily unavailable. Please try again later.';
    
    return NextResponse.json({ 
      success: true, 
      ordersHalted,
      message: haltMessage
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { success: false, error: "Failed to fetch order halt status" }, 
      { status: 500 }
    );
  }
}

