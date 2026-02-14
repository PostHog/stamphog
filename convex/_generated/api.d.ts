/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as seed from "../seed.js";
import type * as slack from "../slack.js";
import type * as slackWebhook_backfill from "../slackWebhook/backfill.js";
import type * as slackWebhook_handlers from "../slackWebhook/handlers.js";
import type * as slackWebhook_security from "../slackWebhook/security.js";
import type * as slackWebhook_types from "../slackWebhook/types.js";
import type * as stamps from "../stamps.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  seed: typeof seed;
  slack: typeof slack;
  "slackWebhook/backfill": typeof slackWebhook_backfill;
  "slackWebhook/handlers": typeof slackWebhook_handlers;
  "slackWebhook/security": typeof slackWebhook_security;
  "slackWebhook/types": typeof slackWebhook_types;
  stamps: typeof stamps;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
