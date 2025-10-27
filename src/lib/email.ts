import { Resend } from 'resend';
import crypto from 'crypto';
import { render } from '@react-email/render';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface VerificationEmailData {
  to: string;
  name: string;
  verificationUrl: string;
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getVerificationTokenExpiry(): Date {
  // Token expires in 24 hours
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

export async function sendVerificationEmail({ to, name, verificationUrl }: VerificationEmailData) {
  try {
    const { VerificationEmail } = await import('@/emails/VerificationEmail');
    const emailHtml = await render(React.createElement(VerificationEmail, { name, verificationUrl }));
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Clickyfied4u Admin <noreply@clickyfied4u.com>',
      to: [to],
      subject: 'Verify your email address',
      html: emailHtml,
      text: `
        Welcome to Clickyfied4u, ${name}!
        
        Thanks for signing up! To complete your registration and start using your account, please verify your email address by visiting this link:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours for security reasons.
        
        If you didn't create an account with Clickyfied4u, please ignore this email.
        
        If you have any questions, please contact our support team.
        
        Best regards,
        Clickyfied4u Team
      `
    });

    if (error) {
      // Console statement removed for security
      return { success: false, error };
    }

    // Console log removed for security
    return { success: true, data };
  } catch (error) {
    // Console statement removed for security
    return { success: false, error };
  }
}

export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  try {
    const { WelcomeEmail } = await import('@/emails/WelcomeEmail');
    const emailHtml = await render(React.createElement(WelcomeEmail, { name }));
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Clickyfied4u <noreply@clickyfied4u.com>',
      to: [to],
      subject: 'Welcome to Clickyfied4u!',
      html: emailHtml,
    });

    if (error) {
      // Console statement removed for security
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    // Console statement removed for security
    return { success: false, error };
  }
}

export interface OTPEmailData {
  to: string;
  name: string;
  otpCode: string;
  expiryMinutes?: number;
}

export async function sendOTPEmail({ to, name, otpCode, expiryMinutes = 10 }: OTPEmailData) {
  try {
    const { OTPEmail } = await import('@/emails/OTPEmail');
    const emailHtml = await render(React.createElement(OTPEmail, { name, otpCode, expiryMinutes }));
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Clickyfied4u <security@clickyfied4u.com>',
      to: [to],
      subject: `Your login verification code: ${otpCode}`,
      html: emailHtml,
      text: `
        Login Verification - Clickyfied4u
        
        Hello ${name},
        
        You have requested to sign in to your account. Please use the following One-Time Password (OTP) to complete your login:
        
        OTP CODE: ${otpCode}
        
        This code will expire in ${expiryMinutes} minutes.
        
        SECURITY NOTICE:
        - This code is for one-time use only
        - Never share this code with anyone
        - If you didn't request this login, please ignore this email
        
        If you need assistance, please contact our support team.
        
        Best regards,
        Clickyfied4u Security Team
      `
    });

    if (error) {
      // Console statement removed for security
      return { success: false, error };
    }

    // Console log removed for security
    return { success: true, data };
  } catch (error) {
    // Console statement removed for security
    return { success: false, error };
  }
}

