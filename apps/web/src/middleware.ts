export { auth as middleware } from '@/lib/auth.js';

export const config = {
  // Protect the dashboard; allow auth, static, and public routes through.
  matcher: ['/dashboard/:path*'],
};
