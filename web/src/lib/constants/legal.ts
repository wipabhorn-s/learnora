/**
 * ข้อมูลที่ใช้ในหน้า Terms of Service / Privacy Policy แก้ที่นี่ที่เดียว
 *
 * ก่อนเปิดให้ใช้งานจริง: เปลี่ยน CONTACT_EMAIL เป็นอีเมลที่ใช้งานได้จริง
 * และควรให้นักกฎหมายตรวจเนื้อหาทั้งสองหน้า (เป็นแม่แบบ ไม่ใช่คำแนะนำทางกฎหมาย)
 */
export const LEGAL = {
  /** อีเมลสำหรับติดต่อเรื่องบัญชี การคืนเงิน และข้อมูลส่วนบุคคล */
  CONTACT_EMAIL: "learnora.th@gmail.com",
  /** วันที่ประกาศใช้เอกสารฉบับปัจจุบัน (แก้เมื่อแก้เนื้อหา) */
  EFFECTIVE_DATE: "2 October 2026",
  /** ต้องตรงกับ REFUND_WINDOW_DAYS ใน api/src/purchase/refund-policy.ts */
  REFUND_WINDOW_DAYS: 14,
} as const;
