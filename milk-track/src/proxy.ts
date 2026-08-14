import { withAuth } from "next-auth/middleware";

// Export the middleware wrapped in withAuth
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect all routes except auth-related routes and public assets
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
