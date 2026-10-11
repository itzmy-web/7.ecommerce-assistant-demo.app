import { NextResponse, type NextRequest } from "next/server";

/**
 * 登录墙：未持有会话 Cookie 的页面访问一律重定向到 /login。
 * 放行：登录页本身、登录提交 BFF、静态资源。
 * 不拦截 /api/v1/*：该前缀由服务端 BFF 内部调用（不携带浏览器 Cookie）；
 * 页面级这堵墙负责体验，真正的鉴权仍由后端 API 执行。
 */

const PUBLIC_PATHS = ["/login", "/login/submit", "/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const token = request.cookies.get("eo_auth_token")?.value;
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/v1|.*\\.(?:svg|png|jpg|jpeg|css|js|ico)$).*)"],
};
