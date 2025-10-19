# Email Verification Setup Guide

## Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Resend API Configuration
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=Bundle Management <noreply@yourdomain.com>

# Application URL (needed for verification links)
NEXTAUTH_URL=http://localhost:3000  # for development
# NEXTAUTH_URL=https://yourdomain.com  # for production
```

## Resend Setup

1. Sign up for a Resend account at https://resend.com
2. Get your API key from the Resend dashboard
3. Add your domain to Resend (for production)
4. Update the `RESEND_FROM_EMAIL` with your domain

## Features Implemented

### Email Verification Flow
1. **Registration**: Users receive verification email after registering
2. **Email Verification**: Users click link to verify their email
3. **Admin Approval**: After email verification, admins approve the account
4. **Welcome Email**: Users receive welcome email after verification

### API Endpoints
- `POST /api/auth/register` - Registration with email verification
- `GET /api/auth/verify-email?token=...` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email

### Database Changes
Added columns to `users` table:
- `email_verified` (boolean) - Whether email is verified
- `verification_token` (varchar) - Email verification token
- `verification_token_expires` (timestamp) - Token expiration

### User Interface
- **Sign In Page**: Shows verification status and resend option
- **Verification Page**: Dedicated page for email verification results
- **Admin Panel**: Shows email verification status (to be implemented)

## Testing

For development, you can use Resend's test mode or check the browser console for email content during testing.