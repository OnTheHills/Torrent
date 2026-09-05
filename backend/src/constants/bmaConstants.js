// BMA e-GP2 API settings and software-project filters.
const API_URL = "https://egp2.bangkok.go.th/appapi/api/PlanProjects/GetPlanProjectFromFilter";
const PLAN_URL = "https://egp2.bangkok.go.th/plan";
// Thai Buddhist budget year. Update here when switching the imported year.
const BUDGET_YEAR = "2569";
const PAGE_SIZE = 500;
const RETRY_COUNT = 3;
const SOURCE = "BMA-EGP2";
const METHOD = "GET";
const USER_AGENT = "Mozilla/5.0 (compatible; TORRENT/0.1; +https://github.com/openai)";

const STRONG_TERMS = [
  "พัฒนาระบบสารสนเทศ",
  "พัฒนาปรับปรุงระบบสารสนเทศ",
  "ระบบสารสนเทศ",
  "เทคโนโลยีสารสนเทศ",
  "ซอฟต์แวร์",
  "software",
  "โปรแกรมประยุกต์",
  "ระบบโปรแกรม",
  "โปรแกรมสารสนเทศ",
  "โปรแกรมระบบ",
  "ระบบงาน",
  "ฐานข้อมูล",
  "database",
  "เว็บไซต์",
  "website",
  "web application",
  "แอปพลิเคชัน",
  "แอพพลิเคชัน",
  "application",
  "platform",
  "แพลตฟอร์ม",
  "สารบรรณอิเล็กทรอนิกส์",
  "ภูมิสารสนเทศ",
  "คลาวด์",
  "cloud",
  "digital platform",
];

const DEVELOPMENT_TERMS = [
  "พัฒนาระบบ",
  "พัฒนาโปรแกรม",
  "พัฒนาเว็บไซต์",
  "พัฒนาแอป",
  "พัฒนาแอพ",
  "จัดทำระบบ",
  "จัดทําระบบ",
  "จ้างทำระบบ",
  "จ้างทําระบบ",
  "ปรับปรุงระบบ",
];

const IT_CONTEXT_TERMS = [
  "สารสนเทศ",
  "ดิจิทัล",
  "digital",
  "คอมพิวเตอร์",
  "โปรแกรม",
  "ซอฟต์แวร์",
  "software",
  "เว็บไซต์",
  "แอป",
  "แอพ",
  "ฐานข้อมูล",
  "database",
  "platform",
  "แพลตฟอร์ม",
  "อิเล็กทรอนิกส์",
  "ระบบงาน",
  "cloud",
  "คลาวด์",
  "ภูมิสารสนเทศ",
];

const EXCLUDE_TERMS = [
  "ระบบไฟฟ้า",
  "ระบบประปา",
  "ระบบปรับอากาศ",
  "ระบบเครื่องกล",
  "ระบบระบายน้ำ",
  "ระบบระบายน้ํา",
  "ระบบท่อ",
  "ระบบดับเพลิง",
  "ระบบลิฟต์",
  "ระบบแก๊ส",
  "ระบบก๊าซ",
  "ระบบเสียง",
  "ระบบโทรทัศน์",
  "ระบบกล้อง",
  "กล้องโทรทัศน์วงจรปิด",
  "กล้องวงจรปิด",
  "cctv",
  "ระบบเครื่องปรับอากาศ",
  "ระบบสุขาภิบาล",
  "ระบบบำบัด",
  "ระบบบําบัด",
  "ระบบป้องกัน",
  "ระบบแจ้งเหตุเพลิงไหม้",
  "ระบบสัญญาณไฟจราจร",
  "ระบบรดน้ำ",
  "ระบบรดน้ํา",
  "ระบบสาธารณูปโภค",
  "ระบบอุปกรณ์อาคาร",
  "ระบบเครือข่ายสื่อสารสายเคเบิล",
  "interactive board",
  "ชุดอุปกรณ์อัจฉริยะ",
  "ยา apixaban",
  "วัสดุกิจกรรม",
  "วัสดุคอมพิวเตอร์",
  "เครื่องคอมพิวเตอร์ สำหรับงานสำนักงาน",
  "เครื่องคอมพิวเตอร์ สำหรับเรียกดูภาพ",
];

module.exports = {
  API_URL, PLAN_URL, BUDGET_YEAR, PAGE_SIZE, RETRY_COUNT, SOURCE, METHOD, USER_AGENT,
  STRONG_TERMS, DEVELOPMENT_TERMS, IT_CONTEXT_TERMS, EXCLUDE_TERMS,
};
