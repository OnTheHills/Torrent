const { budgetYearFromValue, parseBudget, parseDate } = require("@/utils/torUtils");

function decodeEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|tr|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function tag(block, name) {
  const cdata = block.match(
    new RegExp(`<${name}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${name}>`, "i"),
  );
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return plain ? decodeEntities(plain[1]).trim() : "";
}

function decodeRss(buffer) {
  const head = Buffer.from(buffer.subarray(0, 240)).toString("latin1");
  const encoding = (head.match(/encoding=["']([^"']+)/i) || [])[1] || "utf-8";
  const lower = encoding.toLowerCase();
  if (
    lower.includes("tis-620") ||
    lower.includes("windows-874") ||
    lower.includes("iso-8859-11")
  ) {
    return new TextDecoder("windows-874").decode(buffer);
  }
  return new TextDecoder("utf-8").decode(buffer);
}

function isBudgetYearToken(raw) {
  return /^25\d{2}(?:\.0+)?$/.test(String(raw || "").replace(/,/g, ""));
}

function parseBudgetFromText(text) {
  const labeled = [...String(text || "").matchAll(
    /(?:งบประมาณ|วงเงิน|ราคากลาง)[^\d]{0,24}([\d,]{3,}(?:\.\d+)?)/g,
  )].map((match) => match[1]).find((raw) => !isBudgetYearToken(raw));
  if (labeled) return parseBudget(labeled);
  const baht = [...String(text || "").matchAll(/([\d,]{3,}(?:\.\d+)?)\s*บาท/g)]
    .map((match) => match[1])
    .find((raw) => !isBudgetYearToken(raw));
  return baht ? parseBudget(baht) : 0;
}

function parseDepartmentFromText(text, fallback) {
  const match = text.match(/หน่วยงาน[:\s]+([^\n]+)/);
  const name = match ? match[1].trim() : "";
  return name || fallback || "";
}

function parseRssItems(xml, extras = {}) {
  return [...String(xml || "").matchAll(/<item\b[\s\S]*?<\/item>/gi)].flatMap((match) => {
    const block = match[0];
    const title = stripTags(tag(block, "title"));
    const link = stripTags(tag(block, "link"));
    const guid = stripTags(tag(block, "guid"));
    const description = stripTags(tag(block, "description"));
    const publishedAt = parseDate(tag(block, "pubDate"));
    if (!title || !(guid || link)) return [];
    return [{
      title,
      link,
      guid,
      description,
      publishedAt,
      budgetThb: parseBudgetFromText(`${title}\n${description}`),
      budgetYear: budgetYearFromValue(`${title}\n${description}`),
      department: parseDepartmentFromText(description, extras.department),
      announceType: extras.announceType,
      status: extras.status,
      deptId: extras.deptId,
      agencyId: extras.agencyId,
    }];
  });
}

module.exports = {
  decodeRss,
  parseBudgetFromText,
  parseRssItems,
  stripTags,
};
