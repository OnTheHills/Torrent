const { crc32, inflateSync } = require("node:zlib");

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Validate chunk checksums and bounded scanline data, including Adam7 PNGs.
// Reference: https://www.w3.org/TR/png-3/
function validateCertificatePng(buffer) {
  const invalid = () => { throw new Error("Choose a valid, undamaged PNG certificate."); };
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) invalid();
  let header;
  let ended = false;
  let palette = false;
  let dataEnded = false;
  const compressed = [];
  for (let offset = 8; offset < buffer.length;) {
    if (offset + 12 > buffer.length) invalid();
    const length = buffer.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > buffer.length) invalid();
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, end - 4);
    if (crc32(buffer.subarray(offset + 4, end - 4)) !== buffer.readUInt32BE(end - 4)) invalid();
    if (!header && type !== "IHDR") invalid();
    if (compressed.length && type !== "IDAT") dataEnded = true;
    if (type === "IHDR") {
      if (header || length !== 13) invalid();
      header = data;
    } else if (type === "PLTE") {
      if (palette || compressed.length || !length || length % 3 || length > 768) invalid();
      palette = true;
    } else if (type === "IDAT") {
      if (dataEnded) invalid();
      compressed.push(data);
    } else if (type === "IEND") {
      if (length || end !== buffer.length) invalid();
      ended = true;
    } else if (!/^[a-zA-Z]{4}$/.test(type) || type[0] === type[0].toUpperCase()) {
      invalid(); // Unknown critical chunks cannot be decoded safely.
    }
    offset = end;
  }
  if (!header || !ended || !compressed.length) invalid();
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const depth = header[8];
  const color = header[9];
  const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
  if (!width || !height || width > 10000 || height > 10000 || width * height > 16000000) {
    throw new Error("PNG dimensions must be at most 10,000 pixels per side and 16 megapixels.");
  }
  if (!depths[color]?.includes(depth) || header[10] !== 0 || header[11] !== 0 || header[12] > 1 || (color === 3 && !palette)) invalid();
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  const passes = header[12]
    ? [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]]
    : [[0, 0, 1, 1]];
  const rows = passes.map(([x, y, dx, dy]) => {
    const w = Math.max(0, Math.ceil((width - x) / dx));
    const h = Math.max(0, Math.ceil((height - y) / dy));
    return { bytes: Math.ceil(w * channels * depth / 8) + 1, count: w ? h : 0 };
  });
  const expected = rows.reduce((sum, row) => sum + row.bytes * row.count, 0);
  let pixels;
  try {
    pixels = inflateSync(Buffer.concat(compressed), { maxOutputLength: expected });
  } catch {
    invalid();
  }
  if (pixels.length !== expected) invalid();
  let offset = 0;
  for (const row of rows) {
    for (let y = 0; y < row.count; y++) {
      if (pixels[offset] > 4) invalid();
      offset += row.bytes;
    }
  }
}

module.exports = { validateCertificatePng };
