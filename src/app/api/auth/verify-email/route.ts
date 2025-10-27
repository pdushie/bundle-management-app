import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Verification token is required' },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    // Find user with this verification token
    const result = await client.query(
      `SELECT id, email, name, email_verified, verification_token_expires 
       FROM users 
       WHERE verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      // Redirect to verification page with error status
      return NextResponse.redirect(new URL('/auth/verify-email?status=error&message=Invalid+verification+token', request.url));
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      // Redirect to verification page with already verified status
      return NextResponse.redirect(new URL('/auth/verify-email?status=already-verified', request.url));
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(user.verification_token_expires);
    
    if (now > expiresAt) {
      // Redirect to verification page with expired status
      return NextResponse.redirect(new URL('/auth/verify-email?status=expired', request.url));
    }

    // Update user as verified
    await client.query(
      `UPDATE users 
       SET email_verified = true, 
           verification_token = NULL, 
           verification_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    );

    // Send welcome email
    try {
      const { sendWelcomeEmail } = await import('@/lib/email');
      await sendWelcomeEmail({
        to: user.email,
        name: user.name
      });
    } catch (emailError) {
      // Console statement removed for security
      // Don't fail the verification if welcome email fails
    }

    // Redirect to verification page with success
    return NextResponse.redirect(new URL('/auth/verify-email?status=success', request.url));

  } catch (error) {
    // Console statement removed for security
    // Redirect to verification page with error status
    return NextResponse.redirect(new URL('/auth/verify-email?status=error&message=Failed+to+verify+email', request.url));
  } finally {
    client.release();
  }
}

