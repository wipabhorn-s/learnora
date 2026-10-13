/** ใบอนุญาตอัปโหลดจาก API (POST /lessons/video-upload) ใช้ได้ครั้งเดียว อายุราว 1 ชม. */
export type VideoUploadTicket = {
  uploadUrl: string;
  fields: Record<string, string>;
};

/**
 * ส่งไฟล์วิดีโอจากเบราว์เซอร์ตรงไป Cloudinary แล้วคืน public_id ของไฟล์
 *
 * ไม่ผ่าน server ของเรา: ไฟล์ถึง 100 MB ใหญ่เกินที่ server action รับได้บนโฮสต์อย่าง Vercel
 * และไม่ต้องให้ server ถือไฟล์ทั้งก้อนไว้ในหน่วยความจำ ลายเซ็นในใบอนุญาตล็อกที่เก็บไฟล์ไว้แล้ว
 * ใช้ XMLHttpRequest เพราะ fetch ยังบอกความคืบหน้าการอัปโหลดไม่ได้
 */
export function uploadVideo(
  ticket: VideoUploadTicket,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(ticket.fields)) {
      form.set(name, value);
    }
    form.set("file", file);

    const failed = (message = "Video upload failed. Please try again.") =>
      reject(new Error(message));

    const request = new XMLHttpRequest();
    request.open("POST", ticket.uploadUrl);
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () =>
      failed("Could not reach the upload server. Check your connection.");
    request.onabort = () => failed("Video upload was cancelled");
    request.onload = () => {
      const body = request.response as {
        public_id?: string;
        error?: { message?: string };
      } | null;

      if (request.status >= 200 && request.status < 300 && body?.public_id) {
        resolve(body.public_id);
      } else {
        // ข้อความของ Cloudinary บอกสาเหตุตรง ๆ เช่นไฟล์ไม่ใช่วิดีโอ หรือใหญ่เกิน
        failed(body?.error?.message);
      }
    };

    request.send(form);
  });
}
