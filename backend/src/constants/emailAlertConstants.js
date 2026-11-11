const EMAIL_ALERT_CATEGORIES = [
  "Software Development", "Web Application", "Mobile Application", "Data Platform",
  "Digital Platform", "AI / Analytics", "Cybersecurity", "GIS", "Others",
];

const DEFAULT_EMAIL_ALERT_PREFS = {
  emailMatches: true,
  emailDeadlines: true,
  emailIntegrity: false,
  budgetMinThb: 1_000_000,
  budgetMaxThb: 20_000_000,
  categories: ["Web Application", "AI / Analytics"],
};

const EMAIL_PREF_BY_KIND = {
  match: "emailMatches",
  deadline: "emailDeadlines",
  integrity: "emailIntegrity",
};

const MIN_EMAIL_MATCH_PERCENT = 60;
const EMAIL_DEADLINE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const TEST_EMAIL_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_EMAIL_SENDS_PER_RUN = 50;
const EMAIL_SEND_LEASE_MS = 60_000;
const EMAIL_RETRY_BASE_MS = 60_000;
const EMAIL_RETRY_MAX_MINUTES = 60;
const EMAIL_RETRY_EXPONENT_CAP = 6;
const EMAIL_REQUEST_TIMEOUT_MS = 15_000;
const EMAIL_ALERT_CRON = "*/10 * * * *";
const EMAIL_ALERT_TIME_ZONE = "Asia/Bangkok";
const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const DEFAULT_EMAIL_FRONTEND_URL = "http://localhost:3000";
const EMAIL_SUBJECT_TITLE_MAX_LENGTH = 200;

module.exports = {
  EMAIL_ALERT_CATEGORIES,
  DEFAULT_EMAIL_ALERT_PREFS,
  EMAIL_PREF_BY_KIND,
  MIN_EMAIL_MATCH_PERCENT,
  EMAIL_DEADLINE_WINDOW_MS,
  TEST_EMAIL_COOLDOWN_MS,
  MAX_EMAIL_SENDS_PER_RUN,
  EMAIL_SEND_LEASE_MS,
  EMAIL_RETRY_BASE_MS,
  EMAIL_RETRY_MAX_MINUTES,
  EMAIL_RETRY_EXPONENT_CAP,
  EMAIL_REQUEST_TIMEOUT_MS,
  EMAIL_ALERT_CRON,
  EMAIL_ALERT_TIME_ZONE,
  RESEND_EMAILS_URL,
  DEFAULT_EMAIL_FRONTEND_URL,
  EMAIL_SUBJECT_TITLE_MAX_LENGTH,
};
