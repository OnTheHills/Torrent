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

module.exports = {
  ANNOUNCE_TYPES,
  API_URLS,
  DEPARTMENTS,
  METHOD,
  RETRY_COUNT,
  SOURCE,
  TIMEOUT_MS,
  USER_AGENT,
};
