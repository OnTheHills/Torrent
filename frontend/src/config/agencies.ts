export type AgencyId = "bma" | "mdes" | "dga" | "depa" | "mol";

export type DataSourceKind = "bma-ocds" | "egp-rss" | "html";

export type SourceVerdict = "green" | "yellow" | "red";

export interface AgencySource {
  kind: DataSourceKind;
  labelEn: string;
  labelTh: string;
  url: string;
  /** Human-facing docs / download page, if different from the machine URL. */
  pageUrl?: string;
}

export interface Agency {
  id: AgencyId;
  shortEn: string;
  shortTh: string;
  nameEn: string;
  nameTh: string;
  /** e-GP RSS deptId when known. */
  egpDeptId?: string;
  listingUrl: string;
  sources: AgencySource[];
}

/**
 * Five software-TOR sources. BMA is official JSON; MDES is official RSS
 * (ministry page as fallback); DGA, depa, and Labour are public HTML listings.
 * Do not scrape login-walled or JS-only e-GP pages.
 */
export const AGENCIES: Agency[] = [
  {
    id: "bma",
    shortEn: "BMA",
    shortTh: "กทม",
    nameEn: "Bangkok Metropolitan Administration",
    nameTh: "กรุงเทพมหานคร",
    listingUrl: "https://opencontract.bangkok.go.th/ocds.html",
    sources: [
      {
        kind: "bma-ocds",
        labelEn: "BMA Open Contracting (OCDS JSON)",
        labelTh: "สัญญาเปิด กทม. (OCDS JSON)",
        url: "https://opencontract.bangkok.go.th/assets/data/output/yearly/ocds_releases_2569.json",
        pageUrl: "https://opencontract.bangkok.go.th/ocds.html",
      },
    ],
  },
  {
    id: "mdes",
    shortEn: "MDES",
    shortTh: "ดีอี",
    nameEn: "Ministry of Digital Economy and Society",
    nameTh: "กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม",
    egpDeptId: "1700",
    listingUrl: "https://www.mdes.go.th/procurement",
    sources: [
      {
        kind: "egp-rss",
        labelEn: "e-GP RSS (draft TOR / B0)",
        labelTh: "RSS e-GP (ร่าง TOR / B0)",
        url: "https://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml?deptId=1700&anounceType=B0",
        pageUrl: "https://www.mdes.go.th/procurement",
      },
    ],
  },
  {
    id: "dga",
    shortEn: "DGA",
    shortTh: "สพร.",
    nameEn: "Digital Government Development Agency",
    nameTh: "สำนักงานพัฒนารัฐบาลดิจิทัล (องค์การมหาชน)",
    listingUrl: "https://www.dga.or.th/procurements/",
    sources: [
      {
        kind: "html",
        labelEn: "DGA public procurement listing",
        labelTh: "ประกาศจัดซื้อจัดจ้าง สพร.",
        url: "https://www.dga.or.th/procurements/",
        pageUrl: "https://www.dga.or.th/document-sharing/media-file/",
      },
    ],
  },
  {
    id: "depa",
    shortEn: "depa",
    shortTh: "สศด.",
    nameEn: "Digital Economy Promotion Agency",
    nameTh: "สำนักงานส่งเสริมเศรษฐกิจดิจิทัล",
    listingUrl: "https://www.depa.or.th/procurement/procurement",
    sources: [
      {
        kind: "html",
        labelEn: "depa public procurement listing",
        labelTh: "ประกาศจัดซื้อจัดจ้าง สศด.",
        url: "https://www.depa.or.th/procurement/procurement",
      },
    ],
  },
  {
    id: "mol",
    shortEn: "MOL",
    shortTh: "รง.",
    nameEn: "Ministry of Labour",
    nameTh: "กระทรวงแรงงาน",
    listingUrl:
      "https://www.mol.go.th/procurement_categories/draft-tor-and-tender-documents",
    sources: [
      {
        kind: "html",
        labelEn: "MOL draft TOR listing",
        labelTh: "ร่าง TOR กระทรวงแรงงาน",
        url: "https://www.mol.go.th/procurement_categories/draft-tor-and-tender-documents",
      },
    ],
  },
];

export const AGENCY_BY_ID = Object.fromEntries(
  AGENCIES.map((agency) => [agency.id, agency])
) as Record<AgencyId, Agency>;

export const EGP_RSS_BASE =
  "https://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml";

/** Draft TOR / e-bidding documents — official RSS announce type. */
export const EGP_RSS_DRAFT = "B0";
/** Invitation to bid. */
export const EGP_RSS_INVITE = "D0";

export function egpRssUrl(deptId: string, announceType: string) {
  return `${EGP_RSS_BASE}?deptId=${encodeURIComponent(deptId)}&anounceType=${encodeURIComponent(announceType)}`;
}

export function agencyName(id: AgencyId, locale: "en" | "th") {
  const agency = AGENCY_BY_ID[id];
  return locale === "th" ? agency.nameTh : agency.nameEn;
}

export function agencyShort(id: AgencyId, locale: "en" | "th") {
  const agency = AGENCY_BY_ID[id];
  return locale === "th" ? agency.shortTh : agency.shortEn;
}

export function parseAgencyId(value: string | undefined | null): AgencyId | "all" {
  if (value && value in AGENCY_BY_ID) return value as AgencyId;
  return "all";
}
