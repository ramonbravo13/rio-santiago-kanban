import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login');

    // Si ya está autenticado y trata de ir al login, redirigir al dashboard
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Verificar permisos de admin para rutas protegidas
    if (req.nextUrl.pathname.startsWith('/users') ||
        req.nextUrl.pathname.startsWith('/programs') ||
        req.nextUrl.pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acceso a páginas de auth sin token
        if (req.nextUrl.pathname.startsWith('/login')) {
          return true;
        }
        // Para todas las demás rutas protegidas, requerir token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/kanban/:path*',
    '/programs/:path*',
    '/users/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/login',
  ],
};
