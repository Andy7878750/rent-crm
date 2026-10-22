import { NextResponse, type NextRequest } from 'next/server';

/**
 * Быстрая проверка: без cookie сессии — на страницу входа.
 * Полная проверка (сессия в базе) — в requireUser() на каждой странице и в каждом действии.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has('rc_session')) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|register|forgot|reset|verify|privacy|_next|favicon.ico|.*\\..*).*)'],
};
