const API_URL = "https://opend.data.go.th/govspending/service/egp-contract";
const SOURCE = "DATA-GO-EGP";
const METHOD = "GET";
const PAGE_SIZE = 10000;
const RETRY_COUNT = 2;
const YEARS = ["2566", "2567", "2568", "2569", "2570"];
const SEARCH_TERMS = [
  "พัฒนาระบบ",
  "ซอฟต์แวร์",
  "เว็บไซต์",
  "แอปพลิเคชัน",
  "ระบบสารสนเทศ",
  "โปรแกรม",
  "software",
  "application",
];
const INCLUDE_KEYWORDS = [
  "พัฒนาซอฟต์แวร์", "จัดทำซอฟต์แวร์", "พัฒนาโปรแกรม", "จัดทำโปรแกรม", "เขียนโปรแกรม",
  "พัฒนาเว็บไซต์", "จัดทำเว็บไซต์", "จ้างทำเว็บไซต์", "ปรับปรุงเว็บไซต์",
  "พัฒนาเว็บแอป", "พัฒนาเว็บแอพ", "พัฒนาแอปพลิเคชัน", "พัฒนาแอปพลิเคชั่น",
  "พัฒนาแอพพลิเคชัน", "พัฒนาแพลตฟอร์ม", "จัดทำแพลตฟอร์ม",
  "พัฒนาระบบสารสนเทศ", "จัดทำระบบสารสนเทศ", "ปรับปรุงระบบสารสนเทศ",
  "พัฒนาระบบฐานข้อมูล", "จัดทำระบบฐานข้อมูล", "ออกแบบและพัฒนาระบบ",
  "ปรับปรุงและพัฒนาระบบ", "ระบบเก็บสำรองข้อมูล",
];
const SYSTEM_ACTION_KEYWORDS = ["พัฒนาระบบ", "จัดทำระบบ", "จ้างทำระบบ", "ปรับปรุงระบบ"];
const SOFTWARE_CONTEXT_KEYWORDS = [
  "ซอฟต์แวร์", "software", "โปรแกรม", "เว็บไซต์", "website", "web application",
  "เว็บแอป", "เว็บแอพ", "แอปพลิเคชัน", "แอปพลิเคชั่น", "แอพพลิเคชัน",
  "application", "แพลตฟอร์ม", "platform", "ระบบสารสนเทศ", "ฐานข้อมูล", "database",
];
const EXCLUDE_KEYWORDS = [
  "ซื้อ", "จัดหา", "เช่าใช้", "เช่าระบบ", "ค่าสิทธิ์", "สิทธิ์การใช้งาน", "license",
  "subscription", "บำรุงรักษา", "ดูแลรักษา", "ซ่อม", "ต่ออายุ", "ครุภัณฑ์", "ค่าวัสดุ",
  "วัสดุคอมพิวเตอร์", "เครื่องคอมพิวเตอร์", "อุปกรณ์", "ระบบเครือข่าย", "ระบบอินเทอร์เน็ต",
  "กล้องวงจรปิด", "ระบบไฟฟ้า", "ระบบประปา", "ระบบปรับอากาศ", "ระบบระบายน้ำ",
  "ระบบดับเพลิง", "ก่อสร้าง", "ระบบโทรศัพท์", "ระบบเสียง", "ระบบภาพและเสียง",
];
const PROJECT_SEARCH_URL =
  "https://process5.gprocurement.go.th/egp-agpc01-web/announcement";

module.exports = {
  API_URL,
  METHOD,
  PAGE_SIZE,
  PROJECT_SEARCH_URL,
  RETRY_COUNT,
  SEARCH_TERMS,
  INCLUDE_KEYWORDS,
  SYSTEM_ACTION_KEYWORDS,
  SOFTWARE_CONTEXT_KEYWORDS,
  EXCLUDE_KEYWORDS,
  SOURCE,
  YEARS,
};
