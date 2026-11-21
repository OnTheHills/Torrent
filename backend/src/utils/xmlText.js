const { SaxesParser } = require("saxes");
const { boundedText } = require("@/utils/boundedText");

const MAX_XML_DEPTH = 64;
const MAX_XML_ELEMENTS = 100000;
function xmlError(code = "UPSTREAM_XML_INVALID") {
  return Object.assign(new Error(code === "UPSTREAM_XML_LIMIT" ? "Upstream XML exceeds structural limits." : "Invalid upstream XML."), { statusCode: 502, code });
}

function parseXml(value) {
  const text = boundedText(value, "XML text");
  const parser = new SaxesParser();
  // Legacy feeds use this HTML entity. No user-defined entities/DTD are allowed.
  parser.ENTITIES.nbsp = " ";
  const stack = [];
  let root;
  let elements = 0;
  parser.on("doctype", () => { throw xmlError(); });
  parser.on("error", () => { throw xmlError(); });
  parser.on("opentag", (tag) => {
    if (++elements > MAX_XML_ELEMENTS || stack.length >= MAX_XML_DEPTH) throw xmlError("UPSTREAM_XML_LIMIT");
    const node = { name: tag.name.toLowerCase(), originalName: tag.name, children: [] };
    if (stack.length) stack.at(-1).children.push(node);
    else root = node;
    stack.push(node);
  });
  const append = (text) => { if (stack.length) stack.at(-1).children.push(text); };
  parser.on("text", append);
  parser.on("cdata", append);
  parser.on("closetag", () => { stack.pop(); });
  parser.write(text).close();
  if (!root) throw xmlError();
  return root;
}

function* elementsNamed(root, name) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.name === name) yield node;
    for (let i = node.children.length - 1; i >= 0; i--) {
      if (typeof node.children[i] !== "string") stack.push(node.children[i]);
    }
  }
}

function xmlText(node) {
  if (!node) return "";
  const chunks = [];
  const stack = [...node.children].reverse();
  while (stack.length) {
    const child = stack.pop();
    if (typeof child === "string") chunks.push(child);
    else {
      // Preserve the separators previously produced by stripping markup.
      chunks.push(child.name === "br" ? "\n" : " ");
      if (["p", "tr", "div", "li"].includes(child.name)) stack.push("\n");
      for (let i = child.children.length - 1; i >= 0; i--) stack.push(child.children[i]);
    }
  }
  return chunks.join("");
}

function childText(node, name) {
  return xmlText(node.children.find((child) => typeof child !== "string" && child.name === name));
}

// Single forward scan. An unterminated CDATA block is preserved as text rather
// than searching its remaining suffix again for every nested opening marker.
function unwrapCdata(text) {
  const chunks = [];
  let cursor = 0;
  while (true) {
    const start = text.indexOf("<![CDATA[", cursor);
    if (start < 0) break;
    const end = text.indexOf("]]>", start + 9);
    if (end < 0) break;
    chunks.push(text.slice(cursor, start), text.slice(start + 9, end));
    cursor = end + 3;
  }
  chunks.push(text.slice(cursor));
  return chunks.join("");
}

module.exports = { parseXml, elementsNamed, xmlText, childText, unwrapCdata, MAX_XML_DEPTH, MAX_XML_ELEMENTS };
