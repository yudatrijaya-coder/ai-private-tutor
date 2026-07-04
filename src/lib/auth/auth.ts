// Re-export for server components
// Middleware should import from "@/lib/auth/edge" instead
export { handlers, signIn, signOut } from "./config";
export { auth } from "./edge";
