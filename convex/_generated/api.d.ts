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
import type * as baseline from "../baseline.js";
import type * as carePlans from "../carePlans.js";
import type * as checkIns from "../checkIns.js";
import type * as clerkReconciliation from "../clerkReconciliation.js";
import type * as clerkReconciliationActions from "../clerkReconciliationActions.js";
import type * as clerkWebhooks from "../clerkWebhooks.js";
import type * as consent from "../consent.js";
import type * as encounters from "../encounters.js";
import type * as exposureEntries from "../exposureEntries.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_baselineLogic from "../lib/baselineLogic.js";
import type * as lib_businessLogic from "../lib/businessLogic.js";
import type * as lib_checkInHistoryLogic from "../lib/checkInHistoryLogic.js";
import type * as lib_clerkIssuer from "../lib/clerkIssuer.js";
import type * as lib_clerkWebhookHandlers from "../lib/clerkWebhookHandlers.js";
import type * as lib_clerkWebhookTypes from "../lib/clerkWebhookTypes.js";
import type * as lib_clerkWebhookVerify from "../lib/clerkWebhookVerify.js";
import type * as lib_exposureLogic from "../lib/exposureLogic.js";
import type * as lib_patientDashboardLogic from "../lib/patientDashboardLogic.js";
import type * as lib_recoveryTimelineLogic from "../lib/recoveryTimelineLogic.js";
import type * as lib_safetyEngine from "../lib/safetyEngine.js";
import type * as lib_safetyFollowUp from "../lib/safetyFollowUp.js";
import type * as lib_safetyRules from "../lib/safetyRules.js";
import type * as lib_symptomMethodology from "../lib/symptomMethodology.js";
import type * as lib_validators from "../lib/validators.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as onboarding from "../onboarding.js";
import type * as patientDashboard from "../patientDashboard.js";
import type * as patients from "../patients.js";
import type * as recoveryTimeline from "../recoveryTimeline.js";
import type * as recoveryTrends from "../recoveryTrends.js";
import type * as safety from "../safety.js";
import type * as seed from "../seed.js";
import type * as symptomSummaries from "../symptomSummaries.js";
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
  baseline: typeof baseline;
  carePlans: typeof carePlans;
  checkIns: typeof checkIns;
  clerkReconciliation: typeof clerkReconciliation;
  clerkReconciliationActions: typeof clerkReconciliationActions;
  clerkWebhooks: typeof clerkWebhooks;
  consent: typeof consent;
  encounters: typeof encounters;
  exposureEntries: typeof exposureEntries;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/baselineLogic": typeof lib_baselineLogic;
  "lib/businessLogic": typeof lib_businessLogic;
  "lib/checkInHistoryLogic": typeof lib_checkInHistoryLogic;
  "lib/clerkIssuer": typeof lib_clerkIssuer;
  "lib/clerkWebhookHandlers": typeof lib_clerkWebhookHandlers;
  "lib/clerkWebhookTypes": typeof lib_clerkWebhookTypes;
  "lib/clerkWebhookVerify": typeof lib_clerkWebhookVerify;
  "lib/exposureLogic": typeof lib_exposureLogic;
  "lib/patientDashboardLogic": typeof lib_patientDashboardLogic;
  "lib/recoveryTimelineLogic": typeof lib_recoveryTimelineLogic;
  "lib/safetyEngine": typeof lib_safetyEngine;
  "lib/safetyFollowUp": typeof lib_safetyFollowUp;
  "lib/safetyRules": typeof lib_safetyRules;
  "lib/symptomMethodology": typeof lib_symptomMethodology;
  "lib/validators": typeof lib_validators;
  messages: typeof messages;
  migrations: typeof migrations;
  onboarding: typeof onboarding;
  patientDashboard: typeof patientDashboard;
  patients: typeof patients;
  recoveryTimeline: typeof recoveryTimeline;
  recoveryTrends: typeof recoveryTrends;
  safety: typeof safety;
  seed: typeof seed;
  symptomSummaries: typeof symptomSummaries;
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
