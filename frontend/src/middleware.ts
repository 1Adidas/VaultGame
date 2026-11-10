import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { defaultLocale, locales } from "./i18n/request";

const intlMiddleware = createMiddleware({ locales, defaultLocale, localePrefix: "always" });

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  if (/^\/(vi|en|zh)\/game\/[^/]+/.test(request.nextUrl.pathname)) {
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  }
  return response;
}

export const config = {
  matcher: ["/", "/(vi|en|zh)/:path*"],
};
