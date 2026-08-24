import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes accessible without authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/agriexpert(.*)",
  "/services(.*)",
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
  // Reports which env vars a deployment can see. Never returns values.
  "/api/health(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
