const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 5 * 1024 * 1024;

function limitError(label) {
  return Object.assign(new Error(`${label} exceeds the processing limit.`), {
    statusCode: 502, code: "UPSTREAM_BODY_TOO_LARGE",
  });
}

function boundedText(value, label = "Upstream text") {
  const text = String(value || "");
  if (text.length > MAX_TEXT_CHARS) throw limitError(label);
  return text;
}

// Match each whitespace run once, then inspect its following character.
// A pattern like /[ \t]+\n/ retries the same long run at every starting point.
function trimLineEndSpaces(text) {
  return text.replace(/[ \t]+/g, (run, offset, input) => input[offset + run.length] === "\n" ? "" : run);
}

async function readBoundedBytes(response, maxBytes = MAX_FEED_BYTES) {
  const declared = Number(response.headers?.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw limitError("Upstream response");
  }
  if (response.body === null) return Buffer.alloc(0);
  if (!response.body?.getReader) throw new Error("Upstream response has no readable body.");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw limitError("Upstream response");
      chunks.push(value);
    }
    return Buffer.concat(chunks, length);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

module.exports = { MAX_FEED_BYTES, MAX_TEXT_CHARS, limitError, boundedText, trimLineEndSpaces, readBoundedBytes };
