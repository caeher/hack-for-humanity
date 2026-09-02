/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityExposures from "../activityExposures.js";
import type * as alerts from "../alerts.js";
import type * as auditLogs from "../auditLogs.js";
import type * as carePlans from "../carePlans.js";
import type * as checkIns from "../checkIns.js";
import type * as consent from "../consent.js";
import type * as encounters from "../encounters.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as patients from "../patients.js";
import type * as recoveryTrends from "../recoveryTrends.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityExposures: typeof activityExposures;
  alerts: typeof alerts;
  auditLogs: typeof auditLogs;
  carePlans: typeof carePlans;
  checkIns: typeof checkIns;
  consent: typeof consent;
  encounters: typeof encounters;
  messages: typeof messages;
  migrations: typeof migrations;
  patients: typeof patients;
  recoveryTrends: typeof recoveryTrends;
  seed: typeof seed;
  users: typeof users;
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
