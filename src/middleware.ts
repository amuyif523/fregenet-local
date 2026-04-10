import createMiddleware from "next-intl/middleware";
import { unsealData } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n-config";
import { canAccessAdminPath } from "@/lib/rbac";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always"
});

const ADMIN_SESSION_COOKIE_NAME = "fkl_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;
const localeGroup = locales.join("|");
const localizedAdminPathRegex = new RegExp(`^/(${localeGroup})/admin(?:/.*)?$`);
const localizedAdminLoginRegex = new RegExp(`^/(${localeGroup})/admin/login/?$`);
const adminPathRegex = /^\/admin(?:\/.*)?$/;
const adminLoginRegex = /^\/admin\/login\/?$/;

type MiddlewareAdminSessionData = {
  user?: {
    id?: string;
    role?: string;
  };
  isLoggedIn?: boolean;
};

function resolveLocale(pathname: string) {
  const localeMatch = pathname.match(/^\/([a-zA-Z-]+)(?:\/|$)/);
  const matchedLocale = localeMatch?.[1];

  if (matchedLocale && locales.includes(matchedLocale as (typeof locales)[number])) {
    return matchedLocale as (typeof locales)[number];
  }

  return defaultLocale;
}

function isSessionAuthenticated(session: MiddlewareAdminSessionData | null | undefined) {
  if (!session) {
    return false;
  }

  if (session.isLoggedIn === false) {
    return false;
  }

  return session.isLoggedIn === true || Boolean(session.user?.id);
}

function redirectToLogin(request: NextRequest, locale: (typeof locales)[number]) {
  return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Keep API routes at root and out of locale/auth rewrites.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isAdminPath = adminPathRegex.test(pathname) || localizedAdminPathRegex.test(pathname);
  const isLoginPath = adminLoginRegex.test(pathname) || localizedAdminLoginRegex.test(pathname);

  if (isAdminPath && !isLoginPath) {
    const locale = resolveLocale(pathname);
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!sessionSecret || sessionSecret.length < 32) {
      return redirectToLogin(request, locale);
    }

    const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

    if (!cookieValue) {
      return redirectToLogin(request, locale);
    }

    try {
      const sessionData = await unsealData<MiddlewareAdminSessionData>(cookieValue, {
        password: sessionSecret,
        ttl: ADMIN_SESSION_TTL_SECONDS
      });

      if (!isSessionAuthenticated(sessionData)) {
        return redirectToLogin(request, locale);
      }

      if (!canAccessAdminPath(sessionData?.user?.role, pathname)) {
        const deniedUrl = new URL(`/${locale}/admin`, request.url);
        deniedUrl.searchParams.set("denied", "1");
        return NextResponse.redirect(deniedUrl);
      }
    } catch {
      return redirectToLogin(request, locale);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/admin/:path*", "/:locale/admin/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"]
};
