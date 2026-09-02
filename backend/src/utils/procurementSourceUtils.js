function parseBudget(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, "")) || 0;
}

function classifyCategory(keywordOrTerms) {
  const text = Array.isArray(keywordOrTerms)
    ? keywordOrTerms.join(" ")
    : keywordOrTerms || "";
  const normalizedText = text.toLowerCase();

  if (!text) return "Software Development";
  if (
    text.includes("เว็บไซต์") ||
    text.includes("เว็บ") ||
    normalizedText.includes("website") ||
    normalizedText.includes("web application")
  ) {
    return "Web Application";
  }
  if (
    text.includes("แอปพลิเคชัน") ||
    text.includes("แอพ") ||
    normalizedText.includes("application")
  ) {
    return "Mobile Application";
  }
  if (
    text.includes("ฐานข้อมูล") ||
    text.includes("แพลตฟอร์ม") ||
    normalizedText.includes("database") ||
    normalizedText.includes("platform")
  ) {
    return "Data Platform";
  }
  if (text.includes("ภูมิสารสนเทศ")) {
    return "AI / Analytics";
  }
  return "Software Development";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  classifyCategory,
  parseBudget,
  wait,
};
