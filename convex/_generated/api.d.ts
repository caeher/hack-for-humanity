/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accessNotifications from "../accessNotifications.js";
import type * as activityExposures from "../activityExposures.js";
import type * as aiGovernance from "../aiGovernance.js";
import type * as alerts from "../alerts.js";
import type * as attachments from "../attachments.js";
import type * as auditLogs from "../auditLogs.js";
import type * as baseline from "../baseline.js";
import type * as carePlans from "../carePlans.js";
import type * as caregiverDashboard from "../caregiverDashboard.js";
import type * as caseload from "../caseload.js";
import type * as checkIns from "../checkIns.js";
import type * as clerkReconciliation from "../clerkReconciliation.js";
import type * as cohortAnalytics from "../cohortAnalytics.js";
import type * as clerkReconciliationActions from "../clerkReconciliationActions.js";
import type * as clerkWebhooks from "../clerkWebhooks.js";
import type * as consent from "../consent.js";
import type * as crons from "../crons.js";
import type * as encounters from "../encounters.js";
import type * as educationAssistant from "../educationAssistant.js";
import type * as educationCorpus from "../educationCorpus.js";
import type * as exposureEntries from "../exposureEntries.js";
import type * as http from "../http.js";
import type * as lib_accessNotificationLogic from "../lib/accessNotificationLogic.js";
import type * as lib_attachmentLogic from "../lib/attachmentLogic.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_baselineLogic from "../lib/baselineLogic.js";
import type * as lib_businessLogic from "../lib/businessLogic.js";
import type * as lib_carePlanLogic from "../lib/carePlanLogic.js";
import type * as lib_caregiverAccess from "../lib/caregiverAccess.js";
import type * as lib_caseloadLogic from "../lib/caseloadLogic.js";
import type * as lib_checkInHistoryLogic from "../lib/checkInHistoryLogic.js";
import type * as lib_clerkIssuer from "../lib/clerkIssuer.js";
import type * as lib_clerkWebhookHandlers from "../lib/clerkWebhookHandlers.js";
import type * as lib_clerkWebhookTypes from "../lib/clerkWebhookTypes.js";
import type * as lib_clerkWebhookVerify from "../lib/clerkWebhookVerify.js";
import type * as lib_clinicianAuth from "../lib/clinicianAuth.js";
import type * as lib_cohortAnalyticsLogic from "../lib/cohortAnalyticsLogic.js";
import type * as lib_encounterLogic from "../lib/encounterLogic.js";
import type * as lib_educationLogic from "../lib/educationLogic.js";
import type * as lib_exposureLogic from "../lib/exposureLogic.js";
import type * as lib_messageAuth from "../lib/messageAuth.js";
import type * as lib_messageLogic from "../lib/messageLogic.js";
import type * as lib_notificationLogic from "../lib/notificationLogic.js";
import type * as lib_orgAuth from "../lib/orgAuth.js";
import type * as lib_patientDashboardLogic from "../lib/patientDashboardLogic.js";
import type * as lib_patternDetection from "../lib/patternDetection.js";
import type * as lib_provenance from "../lib/provenance.js";
import type * as lib_recoveryReportLogic from "../lib/recoveryReportLogic.js";
import type * as lib_recoveryTimelineLogic from "../lib/recoveryTimelineLogic.js";
import type * as lib_reminderLogic from "../lib/reminderLogic.js";
import type * as lib_privacyLogic from "../lib/privacyLogic.js";
import type * as lib_retentionLogic from "../lib/retentionLogic.js";
import type * as lib_safetyEngine from "../lib/safetyEngine.js";
import type * as lib_safetyFollowUp from "../lib/safetyFollowUp.js";
import type * as lib_safetyRules from "../lib/safetyRules.js";
import type * as lib_symptomMethodology from "../lib/symptomMethodology.js";
import type * as lib_validators from "../lib/validators.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as notificationJobs from "../notificationJobs.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as orgProvisioning from "../orgProvisioning.js";
import type * as orgProvisioningActions from "../orgProvisioningActions.js";
import type * as orgProvisioningInternal from "../orgProvisioningInternal.js";
import type * as organizations from "../organizations.js";
import type * as patientDashboard from "../patientDashboard.js";
import type * as patients from "../patients.js";
import type * as patternInsights from "../patternInsights.js";
import type * as privacy from "../privacy.js";
import type * as profilePreferences from "../profilePreferences.js";
import type * as recoveryExtraction from "../recoveryExtraction.js";
import type * as recoveryReports from "../recoveryReports.js";
import type * as recoveryTimeline from "../recoveryTimeline.js";
import type * as recoveryTrends from "../recoveryTrends.js";
import type * as reminders from "../reminders.js";
import type * as retention from "../retention.js";
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
  accessNotifications: typeof accessNotifications;
  activityExposures: typeof activityExposures;
  aiGovernance: typeof aiGovernance;
  alerts: typeof alerts;
  attachments: typeof attachments;
  auditLogs: typeof auditLogs;
  baseline: typeof baseline;
  carePlans: typeof carePlans;
  caregiverDashboard: typeof caregiverDashboard;
  caseload: typeof caseload;
  checkIns: typeof checkIns;
  clerkReconciliation: typeof clerkReconciliation;
  cohortAnalytics: typeof cohortAnalytics;
  clerkReconciliationActions: typeof clerkReconciliationActions;
  clerkWebhooks: typeof clerkWebhooks;
  consent: typeof consent;
  crons: typeof crons;
  encounters: typeof encounters;
  educationAssistant: typeof educationAssistant;
  educationCorpus: typeof educationCorpus;
  exposureEntries: typeof exposureEntries;
  http: typeof http;
  "lib/accessNotificationLogic": typeof lib_accessNotificationLogic;
  "lib/attachmentLogic": typeof lib_attachmentLogic;
  "lib/auth": typeof lib_auth;
  "lib/baselineLogic": typeof lib_baselineLogic;
  "lib/businessLogic": typeof lib_businessLogic;
  "lib/carePlanLogic": typeof lib_carePlanLogic;
  "lib/caregiverAccess": typeof lib_caregiverAccess;
  "lib/caseloadLogic": typeof lib_caseloadLogic;
  "lib/checkInHistoryLogic": typeof lib_checkInHistoryLogic;
  "lib/clerkIssuer": typeof lib_clerkIssuer;
  "lib/clerkWebhookHandlers": typeof lib_clerkWebhookHandlers;
  "lib/clerkWebhookTypes": typeof lib_clerkWebhookTypes;
  "lib/clerkWebhookVerify": typeof lib_clerkWebhookVerify;
  "lib/clinicianAuth": typeof lib_clinicianAuth;
  "lib/cohortAnalyticsLogic": typeof lib_cohortAnalyticsLogic;
  "lib/encounterLogic": typeof lib_encounterLogic;
  "lib/educationLogic": typeof lib_educationLogic;
  "lib/exposureLogic": typeof lib_exposureLogic;
  "lib/messageAuth": typeof lib_messageAuth;
  "lib/messageLogic": typeof lib_messageLogic;
  "lib/notificationLogic": typeof lib_notificationLogic;
  "lib/orgAuth": typeof lib_orgAuth;
  "lib/patientDashboardLogic": typeof lib_patientDashboardLogic;
  "lib/patternDetection": typeof lib_patternDetection;
  "lib/provenance": typeof lib_provenance;
  "lib/recoveryReportLogic": typeof lib_recoveryReportLogic;
  "lib/recoveryTimelineLogic": typeof lib_recoveryTimelineLogic;
  "lib/reminderLogic": typeof lib_reminderLogic;
  "lib/privacyLogic": typeof lib_privacyLogic;
  "lib/retentionLogic": typeof lib_retentionLogic;
  "lib/safetyEngine": typeof lib_safetyEngine;
  "lib/safetyFollowUp": typeof lib_safetyFollowUp;
  "lib/safetyRules": typeof lib_safetyRules;
  "lib/symptomMethodology": typeof lib_symptomMethodology;
  "lib/validators": typeof lib_validators;
  messages: typeof messages;
  migrations: typeof migrations;
  notificationJobs: typeof notificationJobs;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  orgProvisioning: typeof orgProvisioning;
  orgProvisioningActions: typeof orgProvisioningActions;
  orgProvisioningInternal: typeof orgProvisioningInternal;
  organizations: typeof organizations;
  patientDashboard: typeof patientDashboard;
  patients: typeof patients;
  patternInsights: typeof patternInsights;
  privacy: typeof privacy;
  profilePreferences: typeof profilePreferences;
  recoveryExtraction: typeof recoveryExtraction;
  recoveryReports: typeof recoveryReports;
  recoveryTimeline: typeof recoveryTimeline;
  recoveryTrends: typeof recoveryTrends;
  reminders: typeof reminders;
  retention: typeof retention;
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
