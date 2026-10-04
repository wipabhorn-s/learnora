/**
 * แจ้งผลการกระทำแบบลอยมุมจอแล้วหายเอง ไม่ดันเนื้อหาอื่นลง ทุกหน้าใช้ตัวนี้
 * ตัวเดียว (ยกเว้นฟอร์ม login / sign up ที่แสดง error ในฟอร์มเอง)
 *
 *   toast.success("Saved")   → สีเขียว
 *   toast.error("Failed")    → สีแดง
 *
 * เก็บสถานะไว้นอก React จึงเรียกได้จากทุกที่ฝั่ง client ไม่ต้องห่อ Provider
 * ส่วนที่แสดงผลคือ <Toaster /> ใน root layout
 */
export type ToastKind = "success" | "error";

export type Toast = { id: number; kind: ToastKind; message: string };

const DURATION_MS = 5000;
const MAX_VISIBLE = 3;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function push(kind: ToastKind, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }].slice(-MAX_VISIBLE);
  emit();
  window.setTimeout(() => dismissToast(id), DURATION_MS);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts() {
  return toasts;
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  /** ใช้กับผลลัพธ์ของ server action ที่มี success กับ message */
  result: (result: { success: boolean; message: string }) =>
    push(result.success ? "success" : "error", result.message),
};
