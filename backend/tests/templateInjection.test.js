const assert = require("node:assert/strict");
const { test } = require("node:test");
const { alertMessage } = require("@/utils/email/alertTemplate");

// Exercise production email rendering. Values must remain data, never template
// source, including stored TOR content and AI-generated matching explanations.
const probes = [
  ["CANARY{{7*7}}END", "CANARY{{7*7}}END"],
  ["CANARY${7*7}END", "CANARY${7*7}END"],
  ["CANARY<%=7*7%>END", "CANARY&lt;%=7*7%&gt;END"],
  ["CANARY#{7*7}END", "CANARY#{7*7}END"],
  ['CANARY${process.env.SSTI_TEST_CANARY}END', 'CANARY${process.env.SSTI_TEST_CANARY}END'],
  [
    'CANARY{{constructor.constructor("return 7*7")()}}END',
    'CANARY{{constructor.constructor(&quot;return 7*7&quot;)()}}END',
  ],
  [
    'CANARY<% throw new Error("template executed") %>END',
    'CANARY&lt;% throw new Error(&quot;template executed&quot;) %&gt;END',
  ],
];

for (const kind of ["match", "deadline", "integrity"]) {
  for (const locale of ["en", "th"]) {
    for (const [input, expectedHtml] of probes) {
      test(`V1.3.7: ${kind}/${locale} renders ${input} literally in every dynamic email field`, (t) => {
        const previous = process.env.SSTI_TEST_CANARY;
        process.env.SSTI_TEST_CANARY = "DO_NOT_EVALUATE_THIS_VALUE";
        t.after(() => {
          if (previous === undefined) delete process.env.SSTI_TEST_CANARY;
          else process.env.SSTI_TEST_CANARY = previous;
        });
        const message = alertMessage(kind, {
          _id: "507f1f77bcf86cd799439011",
          title: locale === "en" ? input : "unused fallback title",
          titleTh: locale === "th" ? input : undefined,
          summary: locale === "en" ? input : "unused fallback summary",
          summaryTh: locale === "th" ? input : undefined,
          category: input, department: input,
        }, { matchPercent: 80, matchReason: input });
        assert.equal(message.html.split(expectedHtml).length - 1, 5);
        assert.ok(message.subject.includes(input));
        assert.ok(message.text.includes(input));
        for (const output of [message.html, message.subject, message.text]) {
          assert.equal(output.includes("CANARY49END"), false);
          assert.equal(output.includes("DO_NOT_EVALUATE_THIS_VALUE"), false);
        }
      });
    }
  }
}
