const { PDFParse } = require("pdf-parse");

const MIN_TEXT_LETTERS = 80;

function letterCount(text) {
  return (String(text || "").match(/[A-Za-z\u0E00-\u0E7F]/g) || []).length;
}

function hasUsableTextLayer(text) {
  return letterCount(text) >= MIN_TEXT_LETTERS;
}

function cleanPdfText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readPdfText(pdfBytes) {
  const parser = new PDFParse({ data: Buffer.from(pdfBytes) });
  try {
    const result = await parser.getText();
    return cleanPdfText(result?.text);
  } finally {
    await parser.destroy();
  }
}

module.exports = {
  MIN_TEXT_LETTERS,
  cleanPdfText,
  hasUsableTextLayer,
  letterCount,
  readPdfText,
};
