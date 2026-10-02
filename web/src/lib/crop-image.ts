/** พื้นที่ที่ผู้ใช้เลือกไว้บนรูปจริง (หน่วยพิกเซลของรูปต้นฉบับ) */
export type CropArea = { x: number; y: number; width: number; height: number };

/**
 * ขนาดรูปผลลัพธ์: ไม่เกิน max และไม่ขยายใหญ่กว่าพื้นที่ที่เลือก (ขยายแล้วแตก)
 * คงสัดส่วนของพื้นที่ที่เลือกไว้เสมอ
 */
export function outputSize(
  area: Pick<CropArea, "width" | "height">,
  max: { width: number; height: number },
): { width: number; height: number } {
  const scale = Math.min(1, max.width / area.width, max.height / area.height);
  return {
    width: Math.max(1, Math.round(area.width * scale)),
    height: Math.max(1, Math.round(area.height * scale)),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image"));
    image.src = src;
  });
}

/**
 * ตัดรูปตามพื้นที่ที่เลือกด้วย canvas แล้วคืนเป็นไฟล์ JPEG พร้อมอัปโหลด
 * พื้นหลังสีขาว: PNG ที่โปร่งใสจะได้ไม่กลายเป็นสีดำเมื่อแปลงเป็น JPEG
 */
export async function cropImage(
  src: string,
  area: CropArea,
  options: { maxWidth: number; maxHeight: number; fileName: string },
): Promise<File> {
  const image = await loadImage(src);
  const size = outputSize(area, {
    width: options.maxWidth,
    height: options.maxHeight,
  });

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser can't edit images");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size.width,
    size.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Could not save the cropped image");

  return new File([blob], options.fileName, { type: "image/jpeg" });
}
