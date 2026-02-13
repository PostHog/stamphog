import { useRouter } from "@tanstack/react-router";
import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useState,
} from "react";
import {
  setTheme as setThemeServerFn,
  type ResolvedTheme,
  type Theme,
} from "~/lib/theme";

type ThemeContextVal = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (val: Theme) => void;
};

const ThemeContext = createContext<ThemeContextVal | null>(null);

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
  theme,
}: PropsWithChildren<{ theme: Theme }>) {
  const router = useRouter();
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(theme),
  );

  useEffect(() => {
    setResolved(resolveTheme(theme));

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(resolveTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  }, [resolved]);

  function handleSetTheme(val: Theme) {
    setThemeServerFn({ data: val }).then(() => router.invalidate());
  }

  return (
    <ThemeContext value={{ theme, resolvedTheme: resolved, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const val = use(ThemeContext);
  if (!val) throw new Error("useTheme must be used within a ThemeProvider");
  return val;
}
