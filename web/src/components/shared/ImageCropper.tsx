"use client";

import { Button } from "@/components/ui/button";
import type { CropArea } from "@/lib/crop-image";
import { cn } from "@/lib/utils";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import Cropper from "react-easy-crop";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

/**
 * ลากรูปเพื่อจัดตำแหน่ง ซูมด้วยแถบเลื่อน ปุ่ม +/- หรือ scroll/pinch
 * แจ้งพื้นที่ที่เลือก (พิกเซลของรูปจริง) ทุกครั้งที่ขยับเสร็จ ให้ผู้เรียกไปตัดรูปเอง
 */
export default function ImageCropper({
  src,
  aspect,
  shape = "rect",
  onAreaChange,
  className,
}: {
  src: string;
  /** สัดส่วนกว้าง/สูง เช่น 1 สำหรับรูปโปรไฟล์, 16/9 สำหรับรูปปกคอร์ส */
  aspect: number;
  shape?: "rect" | "round";
  onAreaChange: (area: CropArea) => void;
  className?: string;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const clamp = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  const changeZoom = (value: number) => setZoom(clamp(value));
  // ปุ่ม +/- คิดจากค่าล่าสุดเสมอ กดรัว ๆ ก็ซูมครบทุกครั้ง
  const stepZoom = (delta: number) =>
    setZoom((current) => clamp(current + delta));

  return (
    <div className={cn("grid gap-3", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl bg-neutral-900",
          // กรอบตัดรูปสี่เหลี่ยมกว้าง ต้องมีพื้นที่ให้ลากรอบ ๆ ด้วย
          shape === "round" ? "aspect-square" : "aspect-[16/10]",
        )}
      >
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomSpeed={0.2}
          aspect={aspect}
          cropShape={shape}
          showGrid={shape === "rect"}
          onCropChange={setCrop}
          onZoomChange={changeZoom}
          onCropComplete={(_, areaPixels) => onAreaChange(areaPixels)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => stepZoom(-ZOOM_STEP * 2)}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
        >
          <Minus />
        </Button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          value={zoom}
          onChange={(event) => changeZoom(Number(event.target.value))}
          aria-label="Zoom"
          className="h-1.5 flex-1 cursor-pointer accent-primary"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => stepZoom(ZOOM_STEP * 2)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
        >
          <Plus />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setCrop({ x: 0, y: 0 });
            setZoom(MIN_ZOOM);
          }}
          aria-label="Reset position and zoom"
          title="Reset"
        >
          <RotateCcw />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Drag to reposition. Use the slider or scroll to zoom.
      </p>
    </div>
  );
}
