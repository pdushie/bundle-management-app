import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.role || !["super_admin", "admin", "standard_admin", "data_processor"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    // Get all user statistics in parallel
    const [pendingResult, approvedResult, rejectedResult, totalResult, adminResult] = await Promise.all([
      client.query("SELECT COUNT(*) AS count FROM users WHERE status = 'pending'"),
      client.query("SELECT COUNT(*) AS count FROM users WHERE status = 'approved'"),
      client.query("SELECT COUNT(*) AS count FROM users WHERE status = 'rejected'"),
      client.query("SELECT COUNT(*) AS count FROM users"),
      client.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' OR role = 'super_admin'")
    ]);

    const stats = {
      pendingCount: parseInt(pendingResult.rows[0].count, 10),
      approvedCount: parseInt(approvedResult.rows[0].count, 10),
      rejectedCount: parseInt(rejectedResult.rows[0].count, 10),
      totalUsers: parseInt(totalResult.rows[0].count, 10),
      adminCount: parseInt(adminResult.rows[0].count, 10)
    };

    return NextResponse.json(stats);
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: "Failed to fetch user statistics" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

