import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE_KEY = "stamphog-window-days";
const DEFAULT = 30;

export const getWindowDays = createServerFn().handler(async () => {
  const raw = getCookie(COOKIE_KEY);
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT;
});

export const setWindowDays = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const n = Math.floor(Number(input));
    return Number.isFinite(n) ? Math.max(1, Math.min(90, n)) : DEFAULT;
  })
  .handler(async ({ data }) => setCookie(COOKIE_KEY, String(data)));
