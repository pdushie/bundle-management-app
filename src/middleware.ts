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
        // Console log removed for security
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }

      // Additional role-based path protection
      if (pathname.startsWith('/admin')) {
        const userRole = token.role;
        
        // Admin pages require admin, standard_admin, super_admin, data_processor, or moderator role
        if (userRole !== 'admin' && userRole !== 'standard_admin' && userRole !== 'super_admin' && userRole !== 'data_processor' && userRole !== 'moderator') {
          // Unauthorized admin access attempt - logging removed for security
          return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
        }

        // Let page-level logic handle specific permission checks
        // No longer redirecting admin users away from /admin - RBAC permissions will be checked at page level
      }

      // Rate limiting for API routes (basic implementation)
      if (pathname.startsWith('/api/')) {
        const userAgent = req.headers.get('user-agent') || '';
        const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
        const clientId = `${token.id}-${forwardedFor}`;
        
        // Add rate limiting logic here if needed
        // For now, just log API access
        // API access - logging removed for security
      }
    }

    // Log suspicious activity
    if (!token && pathname.startsWith('/admin')) {
      const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
      // Unauthorized access attempt to admin area - logging removed for security
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
          // Console log removed for security
          return false;
        }

        // Role-based authorization
        if (pathname.startsWith('/admin')) {
          const hasAdminAccess = token.role === 'admin' || token.role === 'standard_admin' || token.role === 'super_admin' || token.role === 'data_processor' || token.role === 'moderator';
          // Middleware auth check - logging removed for security
          return hasAdminAccess;
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
     * - api/announcements (public announcements endpoint)
     * - auth/signin (custom login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public assets
     */
    '/((?!api/auth|api/announcements|auth/signin|_next/static|_next/image|favicon.ico|public).*)',
  ]
};

