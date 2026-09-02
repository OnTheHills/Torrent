import { AGENCY_BY_ID } from "@/config/agencies";
import type {
  AppNotification,
  BudgetBenchmark,
  PlatformStats,
  PriceAnalysisStatus,
  ShowcaseEntry,
  SuspiciousMonthStat,
  Tor,
  TorCategory,
  VendorMatch,
} from "@/types/tor";

export const SKILL_OPTIONS = [
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Vue.js",
  "MongoDB",
  "PostgreSQL",
  "Flutter",
  "AWS",
  "Docker",
  "Java",
  "Spring Boot",
] as const;

/** Seeded vendor studio — used for automatic profile-fit, not a manual GO/NO-GO list. */
export const MOCK_VENDOR_CAPABILITIES = [
  "React",
  "Next.js",
  "PostgreSQL",
  "Node.js",
  "Web Application",
  "Thai language UX",
  "Government portal experience",
] as const;

export const MOCK_STATS: PlatformStats = {
  totalTors: 412,
  softwareTors: 126,
  suspiciousTors: 14,
  newThisWeek: 27,
  totalDelta: "+27 this week",
  softwareDelta: "+11 this week",
  suspiciousDelta: "+4 this month",
  newDelta: "+19% vs last week",
};

export const MOCK_TORS: Tor[] = [
  {
    id: "tor-001",
    refId: "TOR-2569-001",
    title: "Citizen Services Portal Redesign",
    titleTh: "ปรับปรุงพอร์ทัลบริการประชาชน",
    agencyId: "bma",
    department: "Office of the Permanent Secretary",
    departmentTh: "สำนักงานปลัดกรุงเทพมหานคร",
    category: "Web Application",
    lifecycle: "draft",
    integrity: "ok",
    budgetThb: 4_800_000,
    publishedAt: "2026-08-05",
    deadline: "2026-09-30",
    summary:
      "Draft TOR for a unified citizen services web portal covering permit requests, status tracking, and Thai/English content.",
    summaryTh:
      "ร่าง TOR สำหรับพอร์ทัลบริการประชาชน รวมคำขออนุญาต ติดตามสถานะ และเนื้อหาไทย/อังกฤษ",
    skills: ["React", "Next.js", "PostgreSQL", "Docker"],
    requirements: ["Next.js or equivalent SPA", "Thai language UX", "SSO readiness"],
    egpUrl: "https://opencontract.bangkok.go.th/ocds.html",
    sourceKind: "bma-ocds",
    procurementMethod: "e-Bidding",
    matchScore: 94,
    matchReasons: ["Web Application", "Thai language UX", "Government portal experience"],
  },
  {
    id: "tor-002",
    refId: "TOR-2569-014",
    title: "District Complaint Intake Mobile App",
    titleTh: "แอปรับเรื่องร้องทุกข์ระดับเขต",
    agencyId: "bma",
    department: "Bangkok Metropolitan Administration",
    departmentTh: "กรุงเทพมหานคร",
    category: "Mobile Application",
    lifecycle: "published",
    integrity: "ok",
    budgetThb: 2_350_000,
    publishedAt: "2026-07-28",
    deadline: "2026-08-31",
    summary:
      "Mobile application for residents to file and track district-level complaints with photo evidence.",
    summaryTh: "แอปมือถือให้ประชาชนแจ้งและติดตามเรื่องร้องทุกข์ พร้อมหลักฐานภาพถ่าย",
    skills: ["Flutter", "Node.js", "MongoDB"],
    requirements: ["iOS + Android", "Offline draft saves", "Push notifications"],
    egpUrl: "https://opencontract.bangkok.go.th/ocds.html",
    sourceKind: "bma-ocds",
    matchScore: 91,
    matchReasons: ["Mobile Application", "Push notifications"],
  },
  {
    id: "tor-003",
    refId: "TOR-2569-022",
    title: "Procurement Analytics Data Platform",
    titleTh: "แพลตฟอร์มวิเคราะห์งบจัดซื้อจัดจ้าง",
    agencyId: "bma",
    department: "Finance Department",
    departmentTh: "สำนักการคลัง",
    category: "Data Platform",
    lifecycle: "published",
    integrity: "ok",
    budgetThb: 6_200_000,
    publishedAt: "2026-07-12",
    deadline: "2026-10-15",
    summary:
      "Data platform that aggregates historical software procurement budgets for benchmarking dashboards.",
    summaryTh: "แพลตฟอร์มข้อมูลรวมงบจัดซื้อซอฟต์แวร์ย้อนหลังสำหรับแดชบอร์ดเปรียบเทียบ",
    skills: ["Python", "PostgreSQL", "AWS", "Docker"],
    requirements: ["ETL pipelines", "Role-based dashboards", "Exportable reports"],
    egpUrl: "https://opencontract.bangkok.go.th/ocds.html",
    sourceKind: "bma-ocds",
    matchScore: 87,
  },
  {
    id: "tor-004",
    refId: "TOR-2568-088",
    title: "Hospital Appointment System Integration",
    titleTh: "เชื่อมต่อระบบนัดหมายโรงพยาบาล",
    agencyId: "bma",
    department: "Medical Service Department",
    departmentTh: "สำนักการแพทย์",
    category: "System Integration",
    lifecycle: "awarded",
    integrity: "ok",
    budgetThb: 5_100_000,
    publishedAt: "2026-03-18",
    deadline: "2026-04-30",
    summary: "Integrate legacy hospital scheduling with a central appointment API.",
    summaryTh: "เชื่อมระบบนัดหมายโรงพยาบาลเดิมเข้ากับ API นัดหมายกลาง",
    skills: ["Java", "Spring Boot", "PostgreSQL"],
    requirements: ["API gateway", "Audit logging"],
    egpUrl: "https://opencontract.bangkok.go.th/ocds.html",
    sourceKind: "bma-ocds",
    matchScore: 76,
  },
  {
    id: "tor-005",
    refId: "TOR-2569-031",
    title: "Traffic Camera AI Incident Classifier",
    titleTh: "ระบบ AI จำแนกเหตุการณ์จากกล้องจราจร",
    agencyId: "bma",
    department: "Traffic and Transportation Department",
    departmentTh: "สำนักการจราจรและขนส่ง",
    category: "AI / Analytics",
    lifecycle: "draft",
    integrity: "suspicious",
    budgetThb: 12_500_000,
    publishedAt: "2026-08-08",
    deadline: "2026-09-12",
    summary:
      "AI model that classifies traffic incidents from camera feeds for operator triage.",
    summaryTh: "โมเดล AI จำแนกเหตุการณ์จราจรจากกล้องเพื่อช่วยคัดกรองของผู้ปฏิบัติงาน",
    skills: ["Python", "AWS", "Docker"],
    requirements: ["Computer vision pipeline", "Model evaluation reports"],
    egpUrl: "https://opencontract.bangkok.go.th/ocds.html",
    sourceKind: "bma-ocds",
    matchScore: 82,
    matchReasons: ["AI / Analytics", "Model evaluation reports"],
  },
  {
    id: "tor-006",
    refId: "TOR-2569-040",
    title: "Endpoint Security Hardening Suite",
    titleTh: "ชุดเสริมความปลอดภัยปลายทาง",
    agencyId: "bma",
    department: "Digital Technology Office",
    departmentTh: "สำนักงานเทคโนโลยีสารสนเทศ",
    category: "Cybersecurity",
    lifecycle: "published",
    integrity: "ok",
    budgetThb: 3_900_000,
    publishedAt: "2026-06-30",
    deadline: "2026-08-20",
    summary: "Deploy endpoint detection tooling across selected BMA departments.",
    summaryTh: "ติดตั้งเครื่องมือตรวจจับภัยคุกคามปลายทางในหน่วยงาน กทม. ที่เลือก",
    skills: ["Python", "Docker", "AWS"],
    requirements: ["EDR rollout plan", "SOC playbooks"],
    egpUrl: "https://opencontract.bangkok.go.th/ocds.html",
    sourceKind: "bma-ocds",
    matchScore: 68,
  },
  {
    id: "tor-007",
    refId: "TOR-2569-045",
    title: "Real-time Budget Tracking System",
    titleTh: "ระบบติดตามงบประมาณแบบเรียลไทม์",
    agencyId: "bma",
    department: "Finance Department",
    departmentTh: "สำนักการคลัง",
    category: "Web Application",
    lifecycle: "published",
    integrity: "suspicious",
    budgetThb: 18_200_000,
    publishedAt: "2026-08-01",
    deadline: "2026-09-05",
    summary: "Real-time budget tracking across departments with overlapping prior awards.",
    summaryTh: "ระบบติดตามงบแบบเรียลไทม์ข้ามหน่วยงาน พร้อมประวัติสัญญาที่ทับซ้อน",
    skills: ["React", "Node.js", "MongoDB", "AWS"],
    requirements: ["Realtime dashboards", "Audit trail"],
    egpUrl: "https://opencontract.bangkok.go.th/ocds.html",
    sourceKind: "bma-ocds",
    matchScore: 54,
  },
  {
    id: "tor-008",
    refId: "TOR-2569-DE-012",
    title: "National Digital ID Wallet Integration",
    titleTh: "เชื่อมต่อกระเป๋าดิจิทัลบัตรประชาชน",
    agencyId: "mdes",
    department: "Office of the Permanent Secretary",
    departmentTh: "สำนักงานปลัดกระทรวงดิจิทัลฯ",
    category: "System Integration",
    lifecycle: "draft",
    integrity: "ok",
    budgetThb: 9_400_000,
    publishedAt: "2026-08-10",
    deadline: "2026-10-02",
    summary:
      "Draft TOR to integrate agency services with the national digital ID wallet, including Thai/English UX and audit logs.",
    summaryTh:
      "ร่าง TOR เชื่อมบริการหน่วยงานกับกระเป๋าดิจิทัลบัตรประชาชน รวม UX ไทย/อังกฤษ และบันทึกตรวจสอบ",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Docker"],
    requirements: ["OIDC / digital ID", "Audit logging", "Thai language UX"],
    egpUrl: "https://www.mdes.go.th/procurement",
    sourceKind: "egp-rss",
    matchScore: 88,
    matchReasons: ["System Integration", "Thai language UX", "Government portal experience"],
  },
  {
    id: "tor-009",
    refId: "TOR-2569-DE-018",
    title: "Open Government Data Portal Refresh",
    titleTh: "ปรับปรุงพอร์ทัลข้อมูลเปิดภาครัฐ",
    agencyId: "mdes",
    department: "Office of the Permanent Secretary",
    departmentTh: "สำนักงานปลัดกระทรวงดิจิทัลฯ",
    category: "Web Application",
    lifecycle: "published",
    integrity: "ok",
    budgetThb: 5_600_000,
    publishedAt: "2026-07-22",
    deadline: "2026-09-18",
    summary:
      "Rebuild the open-data catalog with dataset search, CKAN-compatible APIs, and bilingual metadata.",
    summaryTh: "ปรับปรุงแคตตาล็อกข้อมูลเปิด ค้นหาชุดข้อมูล API แบบ CKAN และเมทาดาทาทวิภาษา",
    skills: ["React", "Next.js", "PostgreSQL", "Python"],
    requirements: ["Dataset search", "CKAN or equivalent API", "Bilingual metadata"],
    egpUrl: "https://www.mdes.go.th/procurement",
    sourceKind: "egp-rss",
    matchScore: 90,
    matchReasons: ["Web Application", "Next.js", "Government portal experience"],
  },
  {
    id: "tor-010",
    refId: "DGA-69-0024",
    title: "Government AI Smart Search Service",
    titleTh: "งานจ้างบริการระบบค้นหาด้วยเทคโนโลยีปัญญาประดิษฐ์",
    agencyId: "dga",
    department: "Digital Government Development Agency",
    departmentTh: "สำนักงานพัฒนารัฐบาลดิจิทัล",
    category: "AI / Analytics",
    lifecycle: "draft",
    integrity: "ok",
    budgetThb: 11_200_000,
    publishedAt: "2026-07-15",
    deadline: "2026-10-20",
    summary:
      "Draft TOR for an AI search service over government documents and services, published as DGA-69-0024.",
    summaryTh:
      "ร่าง TOR ระบบค้นหาด้วยปัญญาประดิษฐ์บนเอกสารและบริการภาครัฐ ตามประกาศ DGA-69-0024",
    skills: ["Python", "AWS", "Docker", "PostgreSQL"],
    requirements: ["Document retrieval", "Thai language UX", "Evaluation reports"],
    egpUrl: "https://www.dga.or.th/document-sharing/media-file/",
    sourceKind: "html",
    matchScore: 79,
  },
  {
    id: "tor-011",
    refId: "DGA-67-0172",
    title: "Government Payment Platform",
    titleTh: "พัฒนาระบบแพลตฟอร์มการชำระเงิน",
    agencyId: "dga",
    department: "Digital Government Development Agency",
    departmentTh: "สำนักงานพัฒนารัฐบาลดิจิทัล",
    category: "System Integration",
    lifecycle: "published",
    integrity: "ok",
    budgetThb: 95_000_000,
    publishedAt: "2026-08-06",
    deadline: "2026-09-25",
    summary:
      "Build a shared payment platform for government services, with settlement, receipts, and agency onboarding.",
    summaryTh:
      "พัฒนแพลตฟอร์มชำระเงินร่วมสำหรับบริการภาครัฐ รวมการตัดยอด ใบเสร็จ และการเปิดใช้ของหน่วยงาน",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Docker"],
    requirements: ["Payment orchestration", "Audit logging", "API gateway"],
    egpUrl: "https://www.dga.or.th/procurements/",
    sourceKind: "html",
    matchScore: 85,
    matchReasons: ["Mobile Application", "Offline draft saves"],
  },
  {
    id: "tor-012",
    refId: "TOR-2569-DP-004",
    title: "City Data Platform Maintenance",
    titleTh: "บำรุงรักษาแพลตฟอร์มข้อมูลเมือง",
    agencyId: "depa",
    department: "Digital Economy Promotion Agency",
    departmentTh: "สำนักงานส่งเสริมเศรษฐกิจดิจิทัล",
    category: "Data Platform",
    lifecycle: "published",
    integrity: "ok",
    budgetThb: 4_250_000,
    publishedAt: "2026-04-30",
    deadline: "2026-08-28",
    summary:
      "Operate and maintain depa’s City Data Platform (CDP), including pipelines, catalogs, and agency access.",
    summaryTh:
      "จ้างเหมาบริการบำรุงรักษาแพลตฟอร์มข้อมูลเมือง (CDP) ของ สศด. รวมไปป์ไลน์ แคตตาล็อก และการเข้าถึงของหน่วยงาน",
    skills: ["Python", "PostgreSQL", "AWS", "Docker"],
    requirements: ["ETL pipelines", "Role-based dashboards", "Exportable reports"],
    egpUrl: "https://www.depa.or.th/procurement/procurement",
    sourceKind: "html",
    matchScore: 83,
  },
  {
    id: "tor-013",
    refId: "TOR-2569-LB-033",
    title: "Ministry of Labour Website Rebuild",
    titleTh: "พัฒนาเว็บไซต์กระทรวงแรงงาน",
    agencyId: "mol",
    department: "Office of the Permanent Secretary",
    departmentTh: "สำนักงานปลัดกระทรวงแรงงาน",
    category: "Web Application",
    lifecycle: "published",
    integrity: "suspicious",
    budgetThb: 22_800_000,
    publishedAt: "2026-04-09",
    deadline: "2026-09-16",
    summary:
      "Rebuild mol.go.th to meet the Cybersecurity Act and PDPA. Budget sits well above peer awards for similar scope.",
    summaryTh:
      "จ้างพัฒนาเว็บไซต์กระทรวงแรงงานตาม พ.ร.บ. ไซเบอร์และ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล งบสูงกว่าสัญญาที่คล้ายกันในอดีต",
    skills: ["React", "Next.js", "PostgreSQL", "Node.js"],
    requirements: ["SSO readiness", "Thai language UX", "PDPA / security hardening"],
    egpUrl:
      "https://www.mol.go.th/procurement_categories/draft-tor-and-tender-documents",
    sourceKind: "html",
    matchScore: 61,
  },
  {
    id: "tor-014",
    refId: "TOR-2569-LB-090",
    title: "Informal Labour Data Platform Maintenance",
    titleTh: "บำรุงรักษาแพลตฟอร์มแรงงานนอกระบบ",
    agencyId: "mol",
    department: "Office of the Permanent Secretary",
    departmentTh: "สำนักงานปลัดกระทรวงแรงงาน",
    category: "Data Platform",
    lifecycle: "draft",
    integrity: "ok",
    budgetThb: 2_800_000,
    publishedAt: "2026-05-27",
    deadline: "2026-08-30",
    summary:
      "Draft TOR to maintain the informal-labour data and services platform for FY 2569.",
    summaryTh:
      "ร่าง TOR จ้างเหมาบำรุงรักษาแพลตฟอร์มบริหารจัดการฐานข้อมูลและการบริการสำหรับแรงงานนอกระบบ ปี 2569",
    skills: ["Python", "PostgreSQL", "Docker", "Node.js"],
    requirements: ["Data catalog", "Role-based access", "Uptime / ops runbook"],
    egpUrl:
      "https://www.mol.go.th/procurement_categories/draft-tor-and-tender-documents",
    sourceKind: "html",
    matchScore: 72,
  },
];

export const MOCK_SUSPICIOUS_MONTHS: SuspiciousMonthStat[] = [
  { monthKey: "01", monthEn: "Jan", monthTh: "ม.ค.", count: 1 },
  { monthKey: "02", monthEn: "Feb", monthTh: "ก.พ.", count: 2 },
  { monthKey: "03", monthEn: "Mar", monthTh: "มี.ค.", count: 1 },
  { monthKey: "04", monthEn: "Apr", monthTh: "เม.ย.", count: 3 },
  { monthKey: "05", monthEn: "May", monthTh: "พ.ค.", count: 2 },
  { monthKey: "06", monthEn: "Jun", monthTh: "มิ.ย.", count: 4 },
  { monthKey: "07", monthEn: "Jul", monthTh: "ก.ค.", count: 5 },
  { monthKey: "08", monthEn: "Aug", monthTh: "ส.ค.", count: 7 },
];

export const MOCK_BENCHMARKS: BudgetBenchmark[] = [
  {
    category: "Web Application",
    department: "Multiple",
    year: 2025,
    minThb: 1_200_000,
    medianThb: 3_800_000,
    maxThb: 8_500_000,
    count: 14,
  },
  {
    category: "Mobile Application",
    department: "Multiple",
    year: 2025,
    minThb: 900_000,
    medianThb: 2_400_000,
    maxThb: 5_200_000,
    count: 9,
  },
  {
    category: "Data Platform",
    department: "Multiple",
    year: 2025,
    minThb: 2_500_000,
    medianThb: 5_600_000,
    maxThb: 11_000_000,
    count: 7,
  },
  {
    category: "System Integration",
    department: "Multiple",
    year: 2025,
    minThb: 1_800_000,
    medianThb: 4_500_000,
    maxThb: 9_200_000,
    count: 11,
  },
  {
    category: "AI / Analytics",
    department: "Multiple",
    year: 2025,
    minThb: 3_000_000,
    medianThb: 6_800_000,
    maxThb: 14_000_000,
    count: 5,
  },
  {
    category: "Cybersecurity",
    department: "Multiple",
    year: 2025,
    minThb: 1_500_000,
    medianThb: 3_700_000,
    maxThb: 7_800_000,
    count: 8,
  },
];

export const MOCK_SHOWCASE: ShowcaseEntry[] = [
  {
    id: "sc-001",
    title: "Modular permit workflow for a district portal",
    vendorName: "Chao Phraya Labs",
    category: "Web Application",
    approach:
      "Broke the TOR into reusable workflow modules so district officers could configure forms without redeploying.",
    outcome: "Cut average request handling time by 28% in the pilot district.",
    year: 2025,
  },
  {
    id: "sc-002",
    title: "Complaint app with offline-first drafts",
    vendorName: "Lotus Byte",
    category: "Mobile Application",
    approach:
      "Prioritized offline draft capture and deferred sync so field officers could work in low-connectivity zones.",
    outcome: "90% of pilot submissions completed without connection retries.",
    year: 2024,
  },
  {
    id: "sc-004",
    title: "FHIR facade in front of a legacy HIS",
    vendorName: "Ping River Health",
    category: "System Integration",
    approach:
      "Wrapped existing hospital databases with a narrow FHIR layer instead of a full rip-and-replace, so agency sites could join incrementally.",
    outcome: "First three hospitals exchanging referrals in 11 weeks.",
    year: 2025,
  },
  {
    id: "sc-005",
    title: "CKAN catalog with bilingual metadata first",
    vendorName: "Open River Studio",
    category: "Web Application",
    approach:
      "Shipped search and Thai/English dataset cards before custom visualisations, matching how MDES reviewers actually evaluate portals.",
    outcome: "Catalog usable internally two sprints before public launch.",
    year: 2025,
  },
];

export const MOCK_MATCHES: VendorMatch[] = [
  {
    id: "match-001",
    torId: "tor-001",
    matchedAt: "2026-08-05T09:12:00+07:00",
    reasons: ["Web Application", "Thai language UX", "Government portal experience"],
    matchScore: 94,
  },
  {
    id: "match-002",
    torId: "tor-005",
    matchedAt: "2026-08-08T14:40:00+07:00",
    reasons: ["AI / Analytics", "Model evaluation reports"],
    matchScore: 82,
  },
  {
    id: "match-003",
    torId: "tor-002",
    matchedAt: "2026-07-28T11:05:00+07:00",
    reasons: ["Mobile Application", "Push notifications"],
    matchScore: 91,
  },
  {
    id: "match-005",
    torId: "tor-009",
    matchedAt: "2026-07-22T08:20:00+07:00",
    reasons: ["Web Application", "Next.js", "Government portal experience"],
    matchScore: 90,
  },
  {
    id: "match-006",
    torId: "tor-008",
    matchedAt: "2026-08-10T16:05:00+07:00",
    reasons: ["System Integration", "Thai language UX"],
    matchScore: 88,
  },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-001",
    kind: "match",
    torId: "tor-001",
    title: "New TOR found matching your team",
    titleTh: "พบ TOR ใหม่ที่ตรงกับทีมของคุณ",
    body: "Citizen Services Portal Redesign · Office of the Permanent Secretary",
    bodyTh: "ปรับปรุงพอร์ทัลบริการประชาชน · สำนักงานปลัดกรุงเทพมหานคร",
    createdAt: "2026-08-08",
    read: false,
    matchScore: 94,
    skills: ["React", "Next.js", "PostgreSQL"],
  },
  {
    id: "n-002",
    kind: "risk",
    torId: "tor-007",
    title: "Corruption risk pattern detected",
    titleTh: "ตรวจพบรูปแบบความเสี่ยงทุจริต",
    body: "Real-time Budget Tracking System · overlapping awards flagged",
    bodyTh: "ระบบติดตามงบประมาณแบบเรียลไทม์ · พบสัญญาที่ทับซ้อน",
    createdAt: "2026-08-08",
    read: false,
    matchScore: 54,
    skills: ["React", "Node.js", "MongoDB"],
  },
  {
    id: "n-003",
    kind: "deadline",
    torId: "tor-002",
    title: "Deadline approaching",
    titleTh: "ใกล้ถึงกำหนดปิดรับ",
    body: "District Complaint Intake Mobile App closes in 3 weeks",
    bodyTh: "แอปรับเรื่องร้องทุกข์ระดับเขต ปิดรับในอีก 3 สัปดาห์",
    createdAt: "2026-08-06",
    read: true,
    matchScore: 91,
    skills: ["Flutter", "Node.js"],
  },
  {
    id: "n-005",
    kind: "match",
    torId: "tor-008",
    title: "New TOR found matching your team",
    titleTh: "พบ TOR ใหม่ที่ตรงกับทีมของคุณ",
    body: "National Digital ID Wallet Integration · MDES",
    bodyTh: "เชื่อมต่อกระเป๋าดิจิทัลบัตรประชาชน · กระทรวงดิจิทัลฯ",
    createdAt: "2026-08-10",
    read: false,
    matchScore: 88,
    skills: ["Java", "Spring Boot", "PostgreSQL"],
  },
];

export function getTorById(id: string): Tor | undefined {
  return MOCK_TORS.find((tor) => tor.id === id);
}

export function getBenchmarkForCategory(
  category: TorCategory
): BudgetBenchmark | undefined {
  return MOCK_BENCHMARKS.find((item) => item.category === category);
}

export function getPriceAnalysisStatus(
  budgetThb: number,
  medianThb: number
): PriceAnalysisStatus {
  const ratio = budgetThb / medianThb;
  if (ratio >= 1.15) return "above";
  if (ratio <= 0.85) return "below";
  return "near";
}

export function torProcurementMethod(tor: Tor) {
  return tor.procurementMethod ?? "e-Bidding";
}

/** Days until deadline from a fixed prototype "today" of 2026-08-18. */
export function daysUntilDeadline(iso: string, todayIso = "2026-08-18") {
  const today = new Date(todayIso);
  const deadline = new Date(iso);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isPublishedWithinDays(iso: string, days: number, todayIso = "2026-08-18") {
  const today = new Date(todayIso);
  const published = new Date(iso);
  const diff = Math.ceil((today.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= days;
}

export function formatBudget(amount: number, locale: "en" | "th" = "en"): string {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Competitor-style compact budget: ฿12.5M / ฿12.5 ล้าน */
export function formatBudgetCompact(amount: number, locale: "en" | "th" = "en"): string {
  const millions = amount / 1_000_000;
  const value = millions >= 10 ? millions.toFixed(1) : millions.toFixed(1);
  return locale === "th" ? `฿${value} ล้าน` : `฿${value}M`;
}

export function formatDate(iso: string, locale: "en" | "th" = "en"): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "-";
  
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function torTitle(tor: Tor, locale: "en" | "th") {
  return locale === "th" ? tor.titleTh : tor.title;
}

export function torAgency(tor: Tor, locale: "en" | "th") {
  const agency = AGENCY_BY_ID[tor.agencyId];
  if (!agency) return tor.agencyId || "Unknown";
  return locale === "th" ? agency.nameTh : agency.nameEn;
}

export function torAgencyShort(tor: Tor, locale: "en" | "th") {
  const agency = AGENCY_BY_ID[tor.agencyId];
  if (!agency) return tor.agencyId || "Unknown";
  return locale === "th" ? agency.shortTh : agency.shortEn;
}

export function torDepartment(tor: Tor, locale: "en" | "th") {
  return locale === "th" ? tor.departmentTh : tor.department;
}

export function torAgencyLine(tor: Tor, locale: "en" | "th") {
  const agency = torAgencyShort(tor, locale);
  const dept = torDepartment(tor, locale);
  return `${agency} · ${dept}`;
}

export function unreadNotificationCount() {
  return MOCK_NOTIFICATIONS.filter((item) => !item.read).length;
}
