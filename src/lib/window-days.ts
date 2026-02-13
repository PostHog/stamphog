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
  .inputValidator((input: unknown) => Number(input))
  .handler(async ({ data }) => setCookie(COOKIE_KEY, String(data)));
