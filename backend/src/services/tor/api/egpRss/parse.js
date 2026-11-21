const { budgetYearFromValue, parseBudget, parseDate } = require("@/utils/torUtils");
const { boundedText, trimLineEndSpaces } = require("@/utils/boundedText");
const { decodeXmlBytes } = require("@/utils/xmlDecode");
const { parseXml, elementsNamed, childText, unwrapCdata } = require("@/utils/xmlText");

function decodeEntities(value) {
  return unwrapCdata(boundedText(value))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value) {
  return trimLineEndSpaces(decodeEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|tr|div|li)>/gi, "\n")
    // Do not let a failed tag match scan across subsequent '<' characters:
    // repeated unclosed tags otherwise cause quadratic backtracking.
    .replace(/<[^<>]+>/g, " "))
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function decodeRss(buffer, contentType = "") {
  return decodeXmlBytes(buffer, { contentType });
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
  return [...elementsNamed(parseXml(xml), "item")].flatMap((item) => {
    const title = stripTags(childText(item, "title"));
    const link = stripTags(childText(item, "link"));
    const guid = stripTags(childText(item, "guid"));
    const description = stripTags(childText(item, "description"));
    const publishedAt = parseDate(childText(item, "pubdate"));
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
