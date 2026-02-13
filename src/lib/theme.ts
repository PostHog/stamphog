import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const COOKIE_KEY = "stamphog-theme";

export const getTheme = createServerFn().handler(
  async () => (getCookie(COOKIE_KEY) || "system") as Theme,
);

export const setTheme = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input as Theme)
  .handler(async ({ data }) => setCookie(COOKIE_KEY, data));
