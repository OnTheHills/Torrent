import PptxGenJS from "pptxgenjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const assets = join(root, "assets");

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.title = "TORRENT — Software Project Proposal";
pptx.author = "TORRENT";
pptx.subject = "Software project pitching proposal";

const C = {
  ink: "05080D",
  paper: "FFFFFF",
  wash: "F9FAFC",
  muted: "69758C",
  body: "313A4C",
  title: "1C2433",
  flame: "E46C31",
  peach: "F0A06E",
  orange100: "FBE6D8",
  mint: "F0FAF6",
  teal500: "5EB299",
  teal600: "3D8A75",
  teal800: "1D443A",
  heroMuted: "D1E8DE",
};

const font = "Calibri";

const title = pptx.addSlide();
title.addShape("rect", {
  x: 0,
  y: 0,
  w: 13.333,
  h: 7.5,
  fill: { type: "solid", color: C.teal800 },
});
title.addShape("rect", {
  x: 0,
  y: 0,
  w: 13.333,
  h: 7.5,
  fill: { type: "solid", color: C.teal500, transparency: 35 },
});
title.addShape("ellipse", {
  x: 8.6,
  y: -1.1,
  w: 6.2,
  h: 4.4,
  fill: { type: "solid", color: C.flame, transparency: 62 },
});
title.addShape("rect", {
  x: 0,
  y: 7.42,
  w: 13.333,
  h: 0.08,
  fill: { color: C.teal500 },
});
title.addImage({
  path: join(assets, "logo_dark.png"),
  x: 0.45,
  y: 0.42,
  w: 2.35,
  h: 0.52,
});
title.addText("SOFTWARE PROJECT PROPOSAL", {
  x: 0.45,
  y: 1.85,
  w: 8.4,
  h: 0.32,
  fontFace: font,
  fontSize: 12,
  bold: true,
  color: C.flame,
  margin: 0,
  charSpacing: 3,
});
title.addText("TORRENT", {
  x: 0.45,
  y: 2.2,
  w: 10,
  h: 1.05,
  fontFace: font,
  fontSize: 54,
  bold: true,
  color: C.paper,
  margin: 0,
});
title.addText(
  "A centralized platform that tracks BMA software procurement (TOR) opportunities and proactively matches them to qualified vendors — a reversed job board for government software procurement.",
  {
    x: 0.45,
    y: 3.35,
    w: 8.6,
    h: 1.5,
    fontFace: font,
    fontSize: 16,
    color: C.heroMuted,
    margin: 0,
    valign: "top",
  }
);
title.addText("Napat Kulnarong  ·  Sethtatad Kijkanjanarat  ·  Jirakorn Chaitanaporn", {
  x: 0.45,
  y: 6.35,
  w: 10,
  h: 0.32,
  fontFace: font,
  fontSize: 14,
  bold: true,
  color: C.paper,
  margin: 0,
});
title.addText("Software Project Pitching · Proposal", {
  x: 0.45,
  y: 6.68,
  w: 8,
  h: 0.28,
  fontFace: font,
  fontSize: 13,
  color: C.heroMuted,
  margin: 0,
});

const intro = pptx.addSlide();
intro.addShape("rect", {
  x: 0,
  y: 0,
  w: 13.333,
  h: 7.5,
  fill: { color: C.wash },
});
intro.addShape("rect", {
  x: 0,
  y: 0,
  w: 13.333,
  h: 0.06,
  fill: { color: C.teal500 },
});
intro.addImage({
  path: join(assets, "logo_light.png"),
  x: 0.45,
  y: 0.28,
  w: 1.9,
  h: 0.42,
});
intro.addShape("ellipse", {
  x: 0.45,
  y: 0.92,
  w: 0.34,
  h: 0.34,
  fill: { color: C.peach },
});
intro.addText("01", {
  x: 0.45,
  y: 0.96,
  w: 0.34,
  h: 0.28,
  fontFace: font,
  fontSize: 10,
  bold: true,
  color: C.paper,
  align: "center",
  margin: 0,
});
intro.addText("INTRODUCTION", {
  x: 0.88,
  y: 0.96,
  w: 3,
  h: 0.28,
  fontFace: font,
  fontSize: 12,
  bold: true,
  color: C.flame,
  margin: 0,
  charSpacing: 2.2,
});
intro.addText("A reversed job board for government software procurement", {
  x: 0.45,
  y: 1.5,
  w: 6.15,
  h: 1.35,
  fontFace: font,
  fontSize: 24,
  bold: true,
  color: C.ink,
  margin: 0,
  valign: "top",
});
intro.addText(
  "The BMA Software Procurement Platform is a centralized system that tracks software-related procurement opportunities (TORs) issued under the Bangkok Metropolitan Administration and proactively notifies qualified software vendors, studios, freelancers, and agencies about relevant opportunities.\n\nInstead of vendors searching for work across dozens of scattered portals, TORRENT surfaces and pushes relevant government software TORs directly to them, from draft stage through publication.",
  {
    x: 0.45,
    y: 2.95,
    w: 6.15,
    h: 3.6,
    fontFace: font,
    fontSize: 14,
    color: C.muted,
    margin: 0,
    valign: "top",
  }
);

intro.addShape("roundRect", {
  x: 6.95,
  y: 0.88,
  w: 5.95,
  h: 5.85,
  fill: { color: C.paper },
  rectRadius: 0.1,
});
intro.addText("HOW IT FLIPS THE MODEL", {
  x: 7.2,
  y: 1.08,
  w: 5.45,
  h: 0.28,
  fontFace: font,
  fontSize: 11,
  bold: true,
  color: C.flame,
  margin: 0,
  charSpacing: 2,
});

const cards = [
  {
    y: 1.5,
    fill: C.mint,
    titleColor: C.title,
    bodyColor: C.body,
    n: "1",
    heading: "Government TORs",
    body: "Published across 16 depts, 50 district offices, e-GP portal",
  },
  {
    y: 3.15,
    fill: C.teal800,
    titleColor: C.paper,
    bodyColor: C.heroMuted,
    n: "2",
    heading: "TORRENT Platform",
    body: "Filters software TORs, classifies, tracks draft → final",
  },
  {
    y: 4.8,
    fill: C.orange100,
    titleColor: C.title,
    bodyColor: C.body,
    n: "3",
    heading: "Matched Vendors",
    body: "Studios, freelancers & agencies notified automatically",
  },
];

for (const card of cards) {
  intro.addShape("roundRect", {
    x: 7.2,
    y: card.y,
    w: 5.45,
    h: 1.48,
    fill: { color: card.fill },
    rectRadius: 0.08,
  });
  intro.addShape("roundRect", {
    x: 7.4,
    y: card.y + 0.55,
    w: 0.32,
    h: 0.32,
    fill: { color: C.paper },
    rectRadius: 0.06,
  });
  intro.addText(card.n, {
    x: 7.4,
    y: card.y + 0.58,
    w: 0.32,
    h: 0.26,
    fontFace: font,
    fontSize: 11,
    bold: true,
    color: C.flame,
    align: "center",
    margin: 0,
  });
  intro.addText(card.heading, {
    x: 7.86,
    y: card.y + 0.22,
    w: 4.55,
    h: 0.36,
    fontFace: font,
    fontSize: 16,
    bold: true,
    color: card.titleColor,
    margin: 0,
  });
  intro.addText(card.body, {
    x: 7.86,
    y: card.y + 0.58,
    w: 4.55,
    h: 0.7,
    fontFace: font,
    fontSize: 13,
    color: card.bodyColor,
    margin: 0,
    valign: "top",
  });
}

intro.addText("02", {
  x: 12.4,
  y: 7.05,
  w: 0.5,
  h: 0.25,
  fontFace: font,
  fontSize: 12,
  color: C.muted,
  align: "right",
  margin: 0,
});

const out = join(root, "TORRENT-Software-Project-Proposal.pptx");
await pptx.writeFile({ fileName: out });
console.log(out);
