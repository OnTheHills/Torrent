const assert = require("node:assert/strict");
const { test } = require("node:test");

const { classifyCategory } = require("@/utils/torUtils");

test("category follows the title, with Others for titles that match no pattern", () => {
  assert.equal(classifyCategory("จ้างพัฒนาเว็บไซต์"), "Web Application");
  assert.equal(classifyCategory("พัฒนาระบบ Mobile Application PimD"), "Mobile Application");
  assert.equal(classifyCategory("เพิ่มประสิทธิภาพระบบฐานข้อมูล (Data Lakehouse)"), "Data Platform");
  assert.equal(classifyCategory("พัฒนาแพลตฟอร์มกลางเพื่อการจัดการอาหาร"), "Digital Platform");
  assert.equal(classifyCategory("คลังความรู้ปัญญาประดิษฐ์ (ECT AI Chatbot)"), "AI / Analytics");
  assert.equal(classifyCategory("AMLO Cybercrime Management Platform"), "Cybersecurity");
  assert.equal(classifyCategory("ระบบสารสนเทศภูมิศาสตร์ (GIS)"), "GIS");
  assert.equal(classifyCategory("จ้างพัฒนาระบบสารสนเทศ ปีงบประมาณ พ.ศ. 2570"), "Software Development");
  assert.equal(classifyCategory("จ้างเหมาบำรุงรักษาระบบเทคโนโลยีสารสนเทศ"), "Software Development");
  assert.equal(
    classifyCategory("ปรับปรุงระบบควบคุมอาคารอัตโนมัติ (Building Automation Systems BAS)"),
    "Others",
  );
  assert.equal(classifyCategory("การพัฒนาระบบนิเวศการท่องเที่ยวเชิงสุขภาพ"), "Others");
  assert.equal(classifyCategory("การพัฒนาระบบภาวะผู้นำ"), "Others");
  assert.equal(classifyCategory(""), "Others");
  assert.equal(classifyCategory("เว็บแอปพลิเคชันสำหรับรายการส่งเสริมการขาย"), "Web Application");
});
