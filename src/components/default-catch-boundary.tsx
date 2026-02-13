import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const posthog = usePostHog();
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  useEffect(() => {
    posthog.captureException(error);
  }, [error, posthog]);

  const handleRetry = () => {
    posthog.capture("error_retry_clicked", {
      error_message: error instanceof Error ? error.message : String(error),
    });
    router.invalidate();
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    posthog.capture("error_go_back_clicked", {
      error_message: error instanceof Error ? error.message : String(error),
    });
    window.history.back();
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4">
      <ErrorComponent error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={
            "rounded bg-gray-600 px-2 py-1 font-extrabold text-white uppercase dark:bg-gray-700"
          }
          onClick={handleRetry}
          type="button"
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            className={
              "rounded bg-gray-600 px-2 py-1 font-extrabold text-white uppercase dark:bg-gray-700"
            }
            to="/"
          >
            Home
          </Link>
        ) : (
          <Link
            className={
              "rounded bg-gray-600 px-2 py-1 font-extrabold text-white uppercase dark:bg-gray-700"
            }
            onClick={handleGoBack}
            to="/"
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  );
}
