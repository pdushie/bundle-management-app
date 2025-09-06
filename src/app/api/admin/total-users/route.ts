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

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    // Count all users (or just approved users, depending on your needs)
    const result = await client.query(`
      SELECT COUNT(*) AS count FROM users
    `);

    return NextResponse.json({ 
      totalUsers: parseInt(result.rows[0].count, 10) 
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch total users" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
