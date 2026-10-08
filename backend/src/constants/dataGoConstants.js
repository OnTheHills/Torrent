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
const PROJECT_SEARCH_URL =
  "https://process5.gprocurement.go.th/egp-agpc01-web/announcement";

module.exports = {
  API_URL,
  METHOD,
  PAGE_SIZE,
  PROJECT_SEARCH_URL,
  RETRY_COUNT,
  SEARCH_TERMS,
  SOURCE,
  YEARS,
};
