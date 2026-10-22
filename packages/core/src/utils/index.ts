export { type AdClicks, captureAdClicks, getAdClicks } from './analytics/adClicks';
export { getAdminId, isAdminUser } from './admin';
export type { AttributionPayload } from './analytics/attribution';
export { captureAttribution, clearAttribution, getAttribution } from './analytics/attribution';
export type { AuthFailure } from './analytics/authAnalytics';
export {
  trackLoginEmailChanged,
  trackLoginOtpRequested,
  trackLoginOtpRequestFailed,
  trackLoginOtpResendFailed,
  trackLoginOtpResent,
  trackLoginOtpVerified,
  trackLoginOtpVerifyFailed,
  trackLogout,
  trackTmaSessionExpired,
} from './analytics/authAnalytics';
export type { CheckoutAnalytics, SubmittedPaymentMethod } from './analytics/checkoutAnalytics';
export {
  checkoutEventProperties,
  trackCheckoutStarted,
  trackEmailStepSubmitted,
  trackEmailStepViewed,
  trackPaymentMethodSubmitted,
  withUserId,
} from './analytics/checkoutAnalytics';
export { cn } from './classnames';
export type { ColorGradientStyle } from './subscription/colorParser';
export { getColorGradient, getColorGradientSolid } from './subscription/colorParser';
export {
  calculateDaysLeft,
  formatExpiryDate,
  getExpirationText,
  getIconFromLibrary,
  getLocalizedText,
} from './subscription/configParser';
export { constructSubscriptionUrl } from './subscription/constructSubscriptionUrl';
export type { CookieOptions } from './browser/cookies';
export {
  readCookie,
  readJsonCookie,
  registrableDomain,
  removeCookie,
  writeCookie,
  writeJsonCookie,
} from './browser/cookies';
export { countryName, flagEmoji } from './country';
export { formatIntlPrice, formatPlanPrice } from './payment/currency';
export { toDateString } from './date';
export { detectOs } from './browser/detectOs';
export {
  CRAWLABLE_PATHS,
  configuredDomains,
  currentScope,
  isCrawlablePath,
  isLandingPath,
  isMarketingPath,
  isPlansOrPaymentPlanPath,
  LANDING_PATHS,
  LOCATIONS_PATH,
  localePolicyForHost,
  localizePath,
  MY_IP_PATH,
  markdownPathFor,
  normalizeHostname,
  PRICING_PATH,
  parseDomains,
  pathForLocale,
  REFERRALS_PATH,
  resolveLocaleForHost,
  resolveLocaleForRequest,
  setRequestHostname,
  userScope,
  WHAT_IS_VPN_PATH,
} from './site/domain';
export { formatCurrency, truncate } from './format';
export {
  grantAdsConsent,
  type PurchaseConversion,
  trackPurchaseConversion,
} from './analytics/gtag';
export { initDayjs } from './initDayjs';
export { initUser } from './initUser';
export type { LlmsTxtOptions } from './site/llmsTxt';
export { buildLlmsTxt } from './site/llmsTxt';
export {
  GLOBAL_PAYMENT_PROVIDER,
  type GlobalPaymentProvider,
  pricesIncludeTax,
} from './payment/paymentProvider';
export {
  forgetPendingPurchase,
  rememberPendingPurchase,
  rememberPendingYookassaPayment,
  takePendingPurchase,
  takePendingYookassaPayment,
} from './payment/pendingPayment';
export type { PlanAmounts, PriceCalculation } from './payment/planPricing';
export { calculatePricing, formatPlanAmounts, mapPlans } from './payment/planPricing';
export type { PostHogConsentStatus } from './analytics/posthog';
export {
  phCapture,
  phConsentStatus,
  phGrantImpliedConsent,
  phIdentify,
  phIdentifyGuestCheckout,
  phOptIn,
  phOptOut,
  phReset,
  posthog,
} from './analytics/posthog';
export {
  captureReferral,
  clearReferral,
  getReferral,
  getReferralUserId,
} from './analytics/referral';
export { scrollToTop } from './browser/scrollToTop';
export {
  alternateLinksFor,
  buildRobotsTxt,
  buildSitemap,
  buildStructuredData,
  canonicalUrl,
  isIndexablePath,
  type PageSeo,
  pageSeoFor,
  type SitemapOptions,
} from './site/seo';
export type { Storage } from './browser/storage';
export { createStorage } from './browser/storage';
export { TemplateEngine } from './subscription/templateEngine';
export type { ToltAttribution } from './analytics/tolt';
export {
  isNewAffCode,
  readLandingAffCode,
  readToltAttribution,
  writeToltAttribution,
} from './analytics/tolt';
export { validateEmail } from './validators';
export type { PresetName } from './browser/vibrate';
export { canVibrate, VibrationPresets, vibrate, vibrateStop } from './browser/vibrate';
