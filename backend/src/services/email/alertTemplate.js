const {
  DEFAULT_EMAIL_FRONTEND_URL,
  EMAIL_SUBJECT_TITLE_MAX_LENGTH,
  EMAIL_SUMMARY_MAX_LENGTH,
  EMAIL_MATCH_REASON_MAX_LENGTH,
} = require("@/constants/emailAlertConstants");

function frontendBaseUrl() {
  return (process.env.FRONTEND_URL?.trim() || process.env.CORS_ORIGIN?.split(",")[0]?.trim() || DEFAULT_EMAIL_FRONTEND_URL)
    .replace(/\/+$/, "");
}

function clean(value, limit) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function emailHtml({ label, heading, intro, content, button, url }) {
  const preferencesUrl = `${frontendBaseUrl()}/app/alerts`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#172b4d;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa;"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e9f0;border-radius:16px;">
      <tr><td style="padding:24px 30px;background:#142747;color:#ffffff;border-radius:16px 16px 0 0;font-size:20px;font-weight:bold;letter-spacing:.3px;">Torrent <span style="color:#66e0c9;">Smart Alert</span></td></tr>
      <tr><td style="padding:30px;">
        <p style="margin:0 0 10px;color:#087f74;font-size:12px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;">${escapeHtml(label)}</p>
        <h1 style="margin:0 0 14px;font-size:25px;line-height:1.3;color:#142747;">${escapeHtml(heading)}</h1>
        <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">${escapeHtml(intro)}</p>
        ${content}
        <p style="margin:26px 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 21px;border-radius:8px;background:#087f74;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">${escapeHtml(button)}</a></p>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#64748b;">If the button does not open, use this link:<br><a href="${escapeHtml(url)}" style="color:#087f74;word-break:break-all;">${escapeHtml(url)}</a></p>
      </td></tr>
      <tr><td style="padding:18px 30px;border-top:1px solid #e3e9f0;color:#64748b;font-size:12px;line-height:1.5;">Torrent Smart Alert · <a href="${escapeHtml(preferencesUrl)}" style="color:#087f74;">Manage email alerts</a></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function alertMessage(kind, tor, match) {
  const title = clean(tor.titleTh || tor.title || "TOR", EMAIL_SUBJECT_TITLE_MAX_LENGTH);
  const summary = clean(tor.summaryTh || tor.summary || tor.ocr?.summaryTh || tor.ocr?.summary || tor.description, EMAIL_SUMMARY_MAX_LENGTH);
  const reason = clean(match.matchReason, EMAIL_MATCH_REASON_MAX_LENGTH);
  const score = Number(match.matchPercent).toLocaleString("en-US", { maximumFractionDigits: 1 });
  const url = `${frontendBaseUrl()}/app/tors/${tor._id}`;
  const budget = Number(tor.budgetThb || tor.ocr?.budgetThb);
  const deadline = tor.deadline || tor.ocr?.deadline;
  const deadlineDate = deadline && new Date(deadline);
  const details = [
    ["Category", tor.category],
    ["Agency", tor.departmentTh || tor.department],
    ["Budget", Number.isFinite(budget) && budget > 0 ? `฿${budget.toLocaleString("en-US")}` : ""],
    ["Deadline", deadlineDate && !Number.isNaN(deadlineDate.getTime())
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(deadlineDate) : ""],
  ].filter(([, value]) => value);
  const variants = {
    match: ["New match", "A project matches your profile", "A new TOR fits your vendor profile.", `Torrent match: ${title}`],
    deadline: ["Deadline approaching", "A matched project closes soon", "This matched TOR closes within three days.", `Torrent deadline approaching: ${title}`],
    integrity: ["Integrity update", "Review this matched project", "This TOR has an integrity warning. Review the details before proceeding.", `Torrent integrity update: ${title}`],
  };
  const [label, heading, intro, subject] = variants[kind];
  const detailHtml = details.map(([name, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap;">${escapeHtml(name)}</td><td style="padding:6px 0;color:#172b4d;font-size:13px;font-weight:bold;">${escapeHtml(value)}</td></tr>`).join("");
  const content = `<div style="padding:20px;border:1px solid #e3e9f0;border-radius:12px;background:#f8fafc;">
    <p style="margin:0 0 8px;color:#087f74;font-size:14px;font-weight:bold;">${escapeHtml(score)}% match</p>
    <h2 style="margin:0 0 12px;font-size:18px;line-height:1.4;color:#142747;">${escapeHtml(title)}</h2>
    ${summary ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#475569;">${escapeHtml(summary)}</p>` : ""}
    ${detailHtml ? `<table role="presentation" cellspacing="0" cellpadding="0">${detailHtml}</table>` : ""}
    ${reason ? `<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid #e3e9f0;font-size:13px;line-height:1.6;color:#475569;"><strong>Why it matches:</strong> ${escapeHtml(reason)}</p>` : ""}
  </div>`;
  const text = [intro, "", `${title} — ${score}% match`, summary, ...details.map(([name, value]) => `${name}: ${value}`),
    reason && `Why it matches: ${reason}`, "", `View project: ${url}`, "", `Manage alerts: ${frontendBaseUrl()}/app/alerts`]
    .filter((line) => line !== false && line !== undefined).join("\n");
  return { subject, text, html: emailHtml({ label, heading, intro, content, button: "View project", url }) };
}

module.exports = { alertMessage };
