import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Password gate for the deployed console. Set APP_PASSWORD in the environment
 * and the whole app (pages and API routes) asks for it once per browser via
 * HTTP Basic auth — any username, that password. Without APP_PASSWORD set
 * (local dev), everything stays open.
 */
export function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (given === pass) return NextResponse.next();
    } catch {
      // fall through to the 401
    }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Aspire Content Console"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
