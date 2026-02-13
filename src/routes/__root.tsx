/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type * as React from "react";
import { DefaultCatchBoundary } from "~/components/default-catch-boundary";
import { NotFound } from "~/components/not-found";
import { ThemeProvider } from "~/components/theme-provider";
import { TooltipProvider } from "~/components/ui/tooltip";
import { seo } from "~/lib/seo";
import { getTheme } from "~/lib/theme";
import appCss from "~/styles/app.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  loader: () => getTheme(),
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title: "StampHog",
        description:
          "Realtime leaderboard for PR approval stamps in the PostHog Slack channel.",
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const theme = Route.useLoaderData();
  return (
    <html
      className={theme === "system" ? "" : theme}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        {theme === "system" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var d=document.documentElement;d.classList.add(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}catch(e){}})()`,
            }}
          />
        )}
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <ThemeProvider theme={theme}>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
