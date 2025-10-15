import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Enhanced security checks
    if (token) {
      // Check for potential token tampering
      const now = Math.floor(Date.now() / 1000);
      const tokenIat = (token as any).iat || 0;
      const tokenAge = now - tokenIat;
      
      // If token is older than 2 hours, require re-authentication
      if (tokenAge > 7200) {
        console.log('Token expired, redirecting to sign in');
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }

      // Additional role-based path protection
      if (pathname.startsWith('/admin')) {
        const userRole = token.role;
        
        // Admin pages require admin or superadmin role
        if (userRole !== 'admin' && userRole !== 'superadmin') {
          console.log(`Unauthorized admin access attempt by user role: ${userRole}`);
          return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
        }

        // Superadmin-only paths
        if (pathname === '/admin' && userRole !== 'superadmin') {
          console.log(`Unauthorized superadmin access attempt by user role: ${userRole}`);
          return NextResponse.redirect(new URL('/admin/announcements', req.url));
        }
      }

      // Rate limiting for API routes (basic implementation)
      if (pathname.startsWith('/api/')) {
        const userAgent = req.headers.get('user-agent') || '';
        const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
        const clientId = `${token.id}-${forwardedFor}`;
        
        // Add rate limiting logic here if needed
        // For now, just log API access
        console.log(`API access: ${pathname} by user ${token.id} (${token.role})`);
      }
    }

    // Log suspicious activity
    if (!token && pathname.startsWith('/admin')) {
      const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
      console.log(`Unauthorized access attempt to admin area: ${pathname} from IP: ${forwardedFor}`);
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow public routes (only auth pages)
        if (pathname.startsWith('/auth/')) {
          return true;
        }

        // Require valid token for protected routes
        if (!token) {
          return false;
        }

        // Additional token validation
        if (token.invalid) {
          console.log('Invalid token detected, denying access');
          return false;
        }

        // Role-based authorization
        if (pathname.startsWith('/admin')) {
          return token.role === 'admin' || token.role === 'superadmin';
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth API routes)
     * - auth/signin (custom login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public assets
     */
    '/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico|public).*)',
  ]
};
