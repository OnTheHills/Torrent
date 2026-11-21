const { MAX_FEED_BYTES, boundedText, limitError } = require("@/utils/boundedText");

function encodingError() {
  return Object.assign(new Error("Unsupported, conflicting, or invalid XML encoding."), {
    statusCode: 502, code: "UPSTREAM_XML_ENCODING",
  });
}

function canonicalEncoding(label) {
  switch (label.trim().toLowerCase()) {
    case "utf8": case "utf-8": return "utf-8";
    case "windows-874": case "tis-620": case "iso-8859-11": return "windows-874";
    default: throw encodingError();
  }
}

// One byte-decoding policy for every XML entry point. DTD/entity restrictions
// remain in xmlText.js, after bytes have been decoded without data loss.
function decodeXmlBytes(bytes, { contentType = "" } = {}) {
  if (!(bytes instanceof Uint8Array)) throw encodingError();
  if (bytes.byteLength > MAX_FEED_BYTES) throw limitError("XML response");
  const raw = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declarations = [];
  if ((raw[0] === 0xff && raw[1] === 0xfe) || (raw[0] === 0xfe && raw[1] === 0xff) ||
      (raw[0] === 0 && raw[1] === 0 && raw[2] === 0xfe && raw[3] === 0xff)) throw encodingError();
  const hasBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  if (hasBom) declarations.push("utf-8");

  if (typeof contentType !== "string" || contentType.length > 2048) throw encodingError();
  let headerCharsets = 0;
  for (const parameter of contentType.split(";").slice(1)) {
    const equals = parameter.indexOf("=");
    if (equals < 0 || parameter.slice(0, equals).trim().toLowerCase() !== "charset") continue;
    if (++headerCharsets > 1) throw encodingError();
    let label = parameter.slice(equals + 1).trim();
    if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) label = label.slice(1, -1);
    declarations.push(canonicalEncoding(label));
  }

  // The XML declaration is ASCII in both supported encodings. Bound the
  // inspected prefix and reject excessively long/ambiguous declarations.
  const prefix = raw.subarray(hasBom ? 3 : 0, (hasBom ? 3 : 0) + 1024).toString("latin1");
  if (/^<\?xml\s/i.test(prefix)) {
    const end = prefix.indexOf("?>");
    if (end < 0) throw encodingError();
    const matches = [...prefix.slice(0, end).matchAll(/\bencoding\s*=\s*(["'])([^"']+)\1/gi)];
    if (matches.length > 1) throw encodingError();
    if (matches.length) declarations.push(canonicalEncoding(matches[0][2]));
  }
  if (new Set(declarations).size > 1) throw encodingError();
  try {
    return boundedText(new TextDecoder(declarations[0] || "utf-8", { fatal: true }).decode(raw), "XML text");
  } catch (error) {
    if (error.code === "UPSTREAM_BODY_TOO_LARGE") throw error;
    throw encodingError();
  }
}

module.exports = { decodeXmlBytes };
