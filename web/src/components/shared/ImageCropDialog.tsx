"use client";

import ImageCropper from "@/components/shared/ImageCropper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropImage, type CropArea } from "@/lib/crop-image";
import { useState, useTransition } from "react";

/**
 * หน้าต่างครอปรูปที่เปิดหลังเลือกไฟล์ (ใช้กับรูปปกคอร์ส)
 * กด Apply แล้วได้ไฟล์ที่ตัดแล้วกลับไป ยกเลิก = ไม่เปลี่ยนรูปเดิม
 */
export default function ImageCropDialog({
  src,
  title,
  description,
  aspect,
  maxWidth,
  maxHeight,
  fileName,
  onCancel,
  onApply,
}: {
  /** object URL ของรูปที่เพิ่งเลือก null = ปิดหน้าต่าง */
  src: string | null;
  title: string;
  description: string;
  aspect: number;
  maxWidth: number;
  maxHeight: number;
  fileName: string;
  onCancel: () => void;
  onApply: (file: File) => void;
}) {
  const [area, setArea] = useState<CropArea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const apply = () => {
    if (!src || !area) return;

    startTransition(async () => {
      try {
        onApply(await cropImage(src, area, { maxWidth, maxHeight, fileName }));
        setError(null);
      } catch (cropError) {
        setError(
          cropError instanceof Error
            ? cropError.message
            : "Could not crop image",
        );
      }
    });
  };

  return (
    <Dialog
      open={src !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) {
          setError(null);
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {src && (
          // key: เลือกรูปใหม่ ตำแหน่ง/ซูมเริ่มใหม่ ไม่ค้างจากรูปก่อน
          <ImageCropper
            key={src}
            src={src}
            aspect={aspect}
            onAreaChange={setArea}
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setError(null);
              onCancel();
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={apply} disabled={isPending || !area}>
            {isPending ? "Applying..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
