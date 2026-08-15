"use server";

import { signOut } from "@/lib/auth/auth";

/**
 * Logout action for the dashboard sidebar.
 * Lives in its own module ("use server" at file level) so the server action
 * ID is stable across builds — inline actions inside client components
 * produce "Server Reference ID did not match" errors on hot reload/restart.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
