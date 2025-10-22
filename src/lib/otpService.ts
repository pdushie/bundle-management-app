import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export interface OTPResult {
  success: boolean;
  message: string;
  locked?: boolean;
  lockDuration?: number;
}

export class OTPService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_VALIDITY_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCK_DURATION_MINUTES = 30;

  /**
   * Generate a 6-digit OTP code
   */
  static generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Generate and store OTP for a user
   */
  static async generateOTPForUser(userId: string | number): Promise<OTPResult> {
    const client = await pool.connect();
    
    try {
      console.log('generateOTPForUser called with userId:', userId, 'type:', typeof userId);
      
      // Check if user is currently locked
      const lockCheck = await client.query(
        'SELECT otp_locked_until FROM users WHERE id = $1',
        [userId]
      );

      if (lockCheck.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = lockCheck.rows[0];
      const now = new Date();

      if (user.otp_locked_until && new Date(user.otp_locked_until) > now) {
        const lockTime = Math.ceil((new Date(user.otp_locked_until).getTime() - now.getTime()) / 60000);
        return {
          success: false,
          message: `Account temporarily locked due to too many failed attempts. Try again in ${lockTime} minutes.`,
          locked: true,
          lockDuration: lockTime
        };
      }

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(now.getTime() + this.OTP_VALIDITY_MINUTES * 60000);

      // Store OTP in database and reset attempts if not locked
      const updateResult = await client.query(
        `UPDATE users 
         SET otp_secret = $1, 
             otp_expires = $2, 
             otp_attempts = 0,
             otp_locked_until = NULL
         WHERE id = $3`,
        [otp, expiresAt, userId]
      );
      
      console.log('OTP update query result - rows affected:', updateResult.rowCount);
      console.log('Generated OTP for user:', userId, 'OTP:', otp, 'Expires:', expiresAt);

      return {
        success: true,
        message: 'OTP generated successfully',
      };
    } catch (error) {
      console.error('Error generating OTP:', error);
      return { success: false, message: 'Failed to generate OTP' };
    } finally {
      client.release();
    }
  }

  /**
   * Verify OTP for a user
   */
  static async verifyOTP(userId: string | number, providedOTP: string): Promise<OTPResult> {
    console.log('OTPService.verifyOTP called with:', { userId, providedOTP });
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT otp_secret, otp_expires, otp_attempts, otp_locked_until FROM users WHERE id = $1',
        [userId]
      );

      console.log('Database query result rows:', result.rows.length);
      
      if (result.rows.length === 0) {
        console.log('User not found in database');
        return { success: false, message: 'User not found' };
      }

      const user = result.rows[0];
      console.log('User OTP data:', {
        hasOtpSecret: !!user.otp_secret,
        otpExpires: user.otp_expires,
        attempts: user.otp_attempts,
        lockedUntil: user.otp_locked_until
      });
      
      const now = new Date();

      // Check if user is locked
      if (user.otp_locked_until && new Date(user.otp_locked_until) > now) {
        const lockTime = Math.ceil((new Date(user.otp_locked_until).getTime() - now.getTime()) / 60000);
        return {
          success: false,
          message: `Account temporarily locked. Try again in ${lockTime} minutes.`,
          locked: true,
          lockDuration: lockTime
        };
      }

      // Check if OTP exists and hasn't expired
      if (!user.otp_secret || !user.otp_expires) {
        return { success: false, message: 'No OTP found. Please request a new one.' };
      }

      if (new Date(user.otp_expires) < now) {
        // Clear expired OTP
        await client.query(
          'UPDATE users SET otp_secret = NULL, otp_expires = NULL WHERE id = $1',
          [userId]
        );
        return { success: false, message: 'OTP has expired. Please request a new one.' };
      }

      // Verify OTP
      if (user.otp_secret === providedOTP) {
        // Success - reset attempts and update last login timestamp
        await client.query(
          `UPDATE users 
           SET otp_attempts = 0,
               otp_locked_until = NULL,
               last_login_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [userId]
        );
        console.log(`Updated last login timestamp for user ${userId} via OTP verification`);
        return { success: true, message: 'OTP verified successfully' };
      } else {
        // Failed attempt - increment counter
        const newAttempts = (user.otp_attempts || 0) + 1;
        
        if (newAttempts >= this.MAX_ATTEMPTS) {
          // Lock the account
          const lockUntil = new Date(now.getTime() + this.LOCK_DURATION_MINUTES * 60000);
          await client.query(
            `UPDATE users 
             SET otp_attempts = $1, 
                 otp_locked_until = $2,
                 otp_secret = NULL,
                 otp_expires = NULL
             WHERE id = $1`,
            [newAttempts, lockUntil, userId]
          );
          return {
            success: false,
            message: `Too many failed attempts. Account locked for ${this.LOCK_DURATION_MINUTES} minutes.`,
            locked: true,
            lockDuration: this.LOCK_DURATION_MINUTES
          };
        } else {
          // Increment attempts
          await client.query(
            'UPDATE users SET otp_attempts = $1 WHERE id = $2',
            [newAttempts, userId]
          );
          const remaining = this.MAX_ATTEMPTS - newAttempts;
          return {
            success: false,
            message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          };
        }
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: 'Failed to verify OTP' };
    } finally {
      client.release();
    }
  }

  /**
   * Get OTP status for a user
   */
  static async getOTPStatus(userId: string | number): Promise<{
    hasActiveOTP: boolean;
    expiresAt?: Date;
    isLocked: boolean;
    lockDuration?: number;
    attempts: number;
  }> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT otp_secret, otp_expires, otp_attempts, otp_locked_until FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return { hasActiveOTP: false, isLocked: false, attempts: 0 };
      }

      const user = result.rows[0];
      const now = new Date();

      const isLocked = user.otp_locked_until && new Date(user.otp_locked_until) > now;
      const lockDuration = isLocked 
        ? Math.ceil((new Date(user.otp_locked_until).getTime() - now.getTime()) / 60000)
        : undefined;

      const hasActiveOTP = user.otp_secret && user.otp_expires && new Date(user.otp_expires) > now;

      return {
        hasActiveOTP,
        expiresAt: hasActiveOTP ? new Date(user.otp_expires) : undefined,
        isLocked: !!isLocked,
        lockDuration,
        attempts: user.otp_attempts || 0
      };
    } catch (error) {
      console.error('Error getting OTP status:', error);
      return { hasActiveOTP: false, isLocked: false, attempts: 0 };
    } finally {
      client.release();
    }
  }

  /**
   * Verify and consume OTP (for NextAuth final verification)
   */
  static async verifyAndConsumeOTP(userId: string | number, providedOTP: string): Promise<OTPResult> {
    const client = await pool.connect();
    
    try {
      // First verify the OTP
      const result = await this.verifyOTP(userId, providedOTP);
      
      if (result.success) {
        // If verification successful, now clear the OTP
        await client.query(
          'UPDATE users SET otp_secret = NULL, otp_expires = NULL WHERE id = $1',
          [userId]
        );
        console.log('OTP consumed for user:', userId);
      }
      
      return result;
    } catch (error) {
      console.error('Error verifying and consuming OTP:', error);
      return { success: false, message: 'Failed to verify OTP' };
    } finally {
      client.release();
    }
  }

  /**
   * Clear OTP for a user (useful for cleanup)
   */
  static async clearOTP(userId: string | number): Promise<boolean> {
    const client = await pool.connect();

    try {
      await client.query(
        'UPDATE users SET otp_secret = NULL, otp_expires = NULL WHERE id = $1',
        [userId]
      );
      return true;
    } catch (error) {
      console.error('Error clearing OTP:', error);
      return false;
    } finally {
      client.release();
    }
  }
}