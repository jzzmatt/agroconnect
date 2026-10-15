import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

// Public routes accessible without authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/agriservice(.*)",
  "/agriexpert(.*)",
  "/transport(.*)",
  "/services(.*)",
  "/providers(.*)",
  "/agriacademy(.*)",
  "/agrishopping(.*)",
  "/agrilocalizacao(.*)",
  "/pricing(.*)",
  "/planos(.*)",
  "/about(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/public(.*)",
  // JSON plan activation — handler enforces Clerk auth so fetch is not redirected.
  "/api/subscription(.*)",
  // JSON product create — handler enforces Clerk auth so fetch is not redirected.
  "/api/products(.*)",
  // JSON profile avatar upload — handler enforces Clerk auth so fetch is not redirected.
  "/api/profile(.*)",
  // JSON academy video upload — handler enforces Clerk auth so fetch is not redirected.
  "/api/academy(.*)",
  // JSON transport media upload — handler enforces Clerk auth so fetch is not redirected.
  "/api/transport(.*)",
  // Reports which env vars a deployment can see. Never returns values.
  "/api/health(.*)",
  // Web app manifest must stay public so browsers can install the PWA.
  "/manifest.json",
  "/offline.html",
]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  return NextResponse.next();
});

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    // Clerk throws "handshake status without redirect" out of its own handler.
    // That uncaught exception is what Vercel shows as MIDDLEWARE_INVOCATION_FAILED.
    return (await clerkHandler(request, event)) ?? NextResponse.next();
  } catch (error) {
    console.error("Agroconnect middleware failed", error);
    if (isPublicRoute(request)) {
      return NextResponse.next();
    }
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("redirect_url", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signIn);
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals, the web manifest, and static files.
    // manifest.json must not depend on Clerk or a failed handshake hides the PWA manifest.
    "/((?!_next|manifest\\.json|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
