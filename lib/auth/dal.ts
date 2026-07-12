import "server-only";
import { cache } from "react";
import { getSessionFromCookies } from "./session";

export const getCurrentUser = cache(async () => {
  const session = await getSessionFromCookies();
  if (!session) return null;

  return {
    id: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
  };
});
