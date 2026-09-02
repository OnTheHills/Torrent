const TOR = require("../models/TOR");

const API_URL = "https://thaismegp-api.sme.go.th/smegp/egp_erpocr_rss";

const API_SEARCHES = [
  "พัฒนา",
  "จัดทำระบบ",
  "ปรับปรุงระบบ",
  "จัดทำเว็บไซต์",
  "จัดทำโปรแกรม",
  "จัดทำซอฟต์แวร์",
  "เขียนโปรแกรม",
  "ระบบเก็บสำรองข้อมูล",
];

const INCLUDE_KEYWORDS = [
  "พัฒนาซอฟต์แวร์",
  "จัดทำซอฟต์แวร์",
  "พัฒนาโปรแกรม",
  "จัดทำโปรแกรม",
  "เขียนโปรแกรม",
  "พัฒนาเว็บไซต์",
  "จัดทำเว็บไซต์",
  "จ้างทำเว็บไซต์",
  "ปรับปรุงเว็บไซต์",
  "พัฒนาเว็บแอป",
  "พัฒนาเว็บแอพ",
  "พัฒนาแอปพลิเคชัน",
  "พัฒนาแอปพลิเคชั่น",
  "พัฒนาแอพพลิเคชัน",
  "พัฒนาแพลตฟอร์ม",
  "จัดทำแพลตฟอร์ม",
  "พัฒนาระบบสารสนเทศ",
  "จัดทำระบบสารสนเทศ",
  "ปรับปรุงระบบสารสนเทศ",
  "พัฒนาระบบฐานข้อมูล",
  "จัดทำระบบฐานข้อมูล",
  "ระบบเก็บสำรองข้อมูล",
  "ออกแบบและพัฒนาระบบ",
  "ปรับปรุงและพัฒนาระบบ",
  "เพิ่มประสิทธิภาพระบบ",
  "ปรับปรุงระบบ",
  "จัดทำระบบ",
  "พัฒนาระบบ",
];

const EXCLUDE_KEYWORDS = [
  "ซื้อ", "ค่าสิทธิ์", "สิทธิ์การใช้งาน",
  "เช่าใช้", "เช่าระบบ", "ซ่อม", "บำรุงรักษา", "ดูแลรักษา", "ต่ออายุ",
  "license", "subscription", "ครุภัณฑ์", "ค่าวัสดุ", "จัดหาวัสดุ",
  "วัสดุคอมพิวเตอร์", "อุปกรณ์", "เครื่อง", "ระบบเครือข่าย",
  "ระบบอินเทอร์เน็ต", "กล้องวงจรปิด", "วงจรปิด", "ไฟฟ้า", "ประปา",
  "ระบบระบายน้ำ",
  "ระบบปรับอากาศ", "ระบบดับเพลิง", "ระบบโทรศัพท์", "ระบบเสียง",
  "ระบบภาพและเสียง", "ก่อสร้าง", "บำบัดน้ำเสีย", "รวบรวมน้ำเสีย",
  "ระบบไหลเวียนน้ำ", "ถังเก็บน้ำ", "ระบบการเดินรถ", "ระบบการเดินเรือ",
  "ระบบขนส่งมวลชน", "ระบบการจัดการมูลฝอย", "ระบบการคัดแยกขยะ",
  "บริการส่งเสริมทันตสุขภาพ", "จ้างเหมาบริการเป็นรายบุคคล", "โทรศัพท์",
  "จ้างเหมาบริการจำนวน", "ระบบมาตรฐาน", "ปรับปรุงห้อง", "พลังงานแสงอาทิตย์",
];

const PAGE_SIZE = 500;

// Removes all spaces and converts text to lowercase for easier keyword matching
function compactText(value) {
  if (!value) return "";
  return String(value).toLowerCase().replace(/\s+/g, "");
}

// Checks if a given title contains any of our INCLUDE_KEYWORDS 
// and DOES NOT contain any of the EXCLUDE_KEYWORDS.
function matchingKeyword(title) {
  const normalizedTitle = compactText(title);
  if (!normalizedTitle) return null;

  for (const term of EXCLUDE_KEYWORDS) {
    if (normalizedTitle.includes(compactText(term))) {
      return null;
    }
  }

  for (const keyword of INCLUDE_KEYWORDS) {
    if (normalizedTitle.includes(compactText(keyword))) {
      return keyword;
    }
  }

  return null;
}

async function postJson(payload, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((res) => setTimeout(res, attempt * 1000));
    }
  }
}

async function fetchSearch(search, pageSize = PAGE_SIZE) {
  const basePayload = {
    start: "0",
    length: String(pageSize),
    draw: "10",
    orders: [{ column: "published", dir: "DESC" }],
    search: search,
  };

  const first = await postJson(basePayload);
  const total = parseInt(first.recordsFiltered || first.recordsTotal || 0, 10);
  const rows = first.data || [];

  for (let start = pageSize; start < total; start += pageSize) {
    const payload = { ...basePayload, start: String(start) };
    const result = await postJson(payload);
    rows.push(...(result.data || []));
  }

  return { search, total, rows };
}

function rowIdentity(row) {
  return String(row._id || row.link || JSON.stringify(row));
}

// Fetches candidates concurrently across all API_SEARCHES keywords
async function fetchCandidates() {
  const candidates = new Map();
  const counts = {};

  const promises = API_SEARCHES.map(async (search) => {
    try {
      const { total, rows } = await fetchSearch(search);
      counts[search] = { apiCount: total, fetched: rows.length };
      for (const row of rows) {
        candidates.set(rowIdentity(row), row);
      }
      console.log(`  ${search}: ${rows.length} rows`);
    } catch (error) {
      console.error(`  ${search}: failed: ${error.message}`);
      counts[search] = { apiCount: 0, fetched: 0 };
    }
  });

  await Promise.all(promises);
  return { candidates: Array.from(candidates.values()), counts };
}

// Main synchronization function to be called manually or via Cron
async function runSync() {
  console.log("Starting SME-GP API sync...");
  // 1. Fetch raw data from API
  const { candidates } = await fetchCandidates();
  
  const records = [];
  // 2. Filter out non-software notices
  for (const candidate of candidates) {
    const keyword = matchingKeyword(candidate.title);
    if (!keyword) continue;
    
    records.push({
      ...candidate,
      matchedKeyword: keyword,
    });
  }

  console.log(`Found ${records.length} software-development notices. Syncing to database...`);
  
  let upsertCount = 0;
  // 3. Upsert into database to avoid duplicates
  for (const record of records) {
    const externalId = rowIdentity(record);
    const publishedDate = record.published || record.timeStamp ? new Date(record.published || record.timeStamp) : null;
    
    try {
      await TOR.findOneAndUpdate(
        { externalId },
        {
          $set: {
            title: record.title,
            description: record.deptsubName ? `${record.deptName} - ${record.deptsubName}` : record.deptName,
            link: record.link,
            deptName: record.deptName,
            province: record.province,
            source: "SME-GP",
            publishedAt: publishedDate,
            externalId: externalId,
            status: "Open", // Default status for new items, modify if needed
          },
          $addToSet: { skillNeededList: record.matchedKeyword }
        },
        { upsert: true, new: true }
      );
      upsertCount++;
    } catch (err) {
      console.error(`Error saving TOR ${externalId}:`, err);
    }
  }
  
  console.log(`Sync completed. Upserted ${upsertCount} records.`);
  return { candidatesFound: candidates.length, softwareRecords: records.length, upserted: upsertCount };
}

module.exports = {
  runSync
};
