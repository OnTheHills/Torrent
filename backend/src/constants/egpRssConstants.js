// Official Comptroller General e-GP RSS. Per-department, latest ~20 notices.
// Closed 09:00–12:00 and 13:00–17:00 Asia/Bangkok; open 12:01–12:59 and 17:01–08:59.
const API_URLS = [
  "https://process.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml",
  "https://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml",
  "http://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml",
];
const SOURCE = "EGP-RSS";
const METHOD = "GET";
const RETRY_COUNT = 2;
const TIMEOUT_MS = 12000;
const USER_AGENT =
  "TORRENT-CSP/0.1 (university research; official e-GP RSS)";

const DEPARTMENTS = [
  {
    id: "1700",
    agencyId: "mdes",
    nameTh: "กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม",
  },
];

const ANNOUNCE_TYPES = [
  { code: "B0", status: "draft" },
  { code: "D0", status: "published" },
  { code: "W0", status: "awarded" },
];

const INCLUDE_KEYWORDS = [
  "พัฒนาซอฟต์แวร์", "จัดทำซอฟต์แวร์", "พัฒนาโปรแกรม", "จัดทำโปรแกรม",
  "เขียนโปรแกรม", "พัฒนาเว็บไซต์", "จัดทำเว็บไซต์", "จ้างทำเว็บไซต์",
  "ปรับปรุงเว็บไซต์", "พัฒนาเว็บแอป", "พัฒนาเว็บแอพ", "พัฒนาแอปพลิเคชัน",
  "พัฒนาแอปพลิเคชั่น", "พัฒนาแอพพลิเคชัน", "พัฒนาแพลตฟอร์ม", "จัดทำแพลตฟอร์ม",
  "พัฒนาระบบสารสนเทศ", "จัดทำระบบสารสนเทศ", "ปรับปรุงระบบสารสนเทศ", "พัฒนาระบบฐานข้อมูล",
  "จัดทำระบบฐานข้อมูล", "ระบบเก็บสำรองข้อมูล", "ออกแบบและพัฒนาระบบ", "ปรับปรุงและพัฒนาระบบ",
  "เพิ่มประสิทธิภาพระบบ", "ปรับปรุงระบบ", "จัดทำระบบ", "พัฒนาระบบ",
];
const EXCLUDE_KEYWORDS = [
  "ซื้อ", "ค่าสิทธิ์", "สิทธิ์การใช้งาน", "เช่าใช้", "เช่าระบบ", "ซ่อม", "บำรุงรักษา",
  "ดูแลรักษา", "ต่ออายุ", "license", "subscription", "ครุภัณฑ์", "ค่าวัสดุ", "จัดหาวัสดุ",
  "วัสดุคอมพิวเตอร์", "อุปกรณ์", "เครื่อง", "ระบบเครือข่าย", "ระบบอินเทอร์เน็ต",
  "กล้องวงจรปิด", "วงจรปิด", "ไฟฟ้า", "ประปา", "ระบบระบายน้ำ", "ระบบปรับอากาศ",
  "ระบบดับเพลิง", "ระบบโทรศัพท์", "ระบบเสียง", "ระบบภาพและเสียง", "ก่อสร้าง",
  "บำบัดน้ำเสีย", "รวบรวมน้ำเสีย", "ระบบไหลเวียนน้ำ", "ถังเก็บน้ำ", "ระบบการเดินรถ",
  "ระบบการเดินเรือ", "ระบบขนส่งมวลชน", "ระบบการจัดการมูลฝอย", "ระบบการคัดแยกขยะ",
  "บริการส่งเสริมทันตสุขภาพ", "จ้างเหมาบริการเป็นรายบุคคล", "โทรศัพท์", "จ้างเหมาบริการจำนวน",
  "ระบบมาตรฐาน", "ปรับปรุงห้อง", "พลังงานแสงอาทิตย์",
];

module.exports = {
  ANNOUNCE_TYPES,
  API_URLS,
  DEPARTMENTS,
  INCLUDE_KEYWORDS,
  EXCLUDE_KEYWORDS,
  METHOD,
  RETRY_COUNT,
  SOURCE,
  TIMEOUT_MS,
  USER_AGENT,
};
