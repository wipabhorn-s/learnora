"use client";

import ImageCropper from "@/components/shared/ImageCropper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  removeAvatarAction,
  updateAvatarAction,
} from "@/lib/actions/user.action";
import { cropImage, type CropArea } from "@/lib/crop-image";
import { toast } from "@/lib/toast";
import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/** รูปต้นฉบับใหญ่ได้ (ไม่ได้อัปโหลดตรง) เพราะตัดเหลือ 512×512 ก่อนส่งเสมอ */
const MAX_SOURCE_SIZE = 15 * 1024 * 1024;
const AVATAR_SIZE = 512;

type AvatarUploadDialogProps = {
  avatarUrl: string | null;
  firstName: string;
};

export default function AvatarUploadDialog({
  avatarUrl,
  firstName,
}: AvatarUploadDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  // รูปที่เลือกไว้ (object URL) กำลังจัดตำแหน่ง/ซูมอยู่ในตัวครอป
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [area, setArea] = useState<CropArea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const resetSelection = () => {
    setSourceUrl(null);
    setArea(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }

    if (selectedFile.size > MAX_SOURCE_SIZE) {
      setError("Image must be smaller than 15 MB");
      return;
    }

    setSourceUrl(URL.createObjectURL(selectedFile));
    setArea(null);
    setError(null);
  };

  const handleSave = () => {
    if (!sourceUrl || !area) return;

    startTransition(async () => {
      let cropped: File;
      try {
        cropped = await cropImage(sourceUrl, area, {
          maxWidth: AVATAR_SIZE,
          maxHeight: AVATAR_SIZE,
          fileName: "avatar.jpg",
        });
      } catch (cropError) {
        setError(
          cropError instanceof Error
            ? cropError.message
            : "Could not crop image",
        );
        return;
      }

      const formData = new FormData();
      formData.append("avatarUrl", cropped);

      const result = await updateAvatarAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Profile photo updated");

      setOpen(false);
      resetSelection();
      router.refresh();
    });
  };

  const handleRemove = () => {
    if (!avatarUrl) return;

    const confirmed = window.confirm(
      "Remove your profile picture and use the default avatar?",
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await removeAvatarAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Profile photo removed");

      setOpen(false);
      resetSelection();
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetSelection();
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="absolute inset-0 h-full w-full rounded-full p-0 hover:bg-black/10"
            aria-label="Manage profile picture"
          />
        }
      >
        <span className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border bg-background shadow-md">
          <Camera className="size-4" />
        </span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profile picture</DialogTitle>
          <DialogDescription>
            {sourceUrl
              ? "Drag and zoom to fit your face in the circle, then save."
              : "Choose an image up to 15 MB. You can zoom and reposition it before saving."}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center gap-3 py-2">
          {sourceUrl ? (
            <ImageCropper
              src={sourceUrl}
              aspect={1}
              shape="round"
              onAreaChange={setArea}
              className="w-full"
            />
          ) : (
            <Avatar className="h-48 w-48 border">
              <AvatarImage
                src={avatarUrl ?? undefined}
                alt={`${firstName}'s profile picture`}
              />
              <AvatarFallback className="bg-primary text-6xl font-extrabold text-white">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="sm:flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            <Camera />
            {sourceUrl ? "Choose another" : "Choose photo"}
          </Button>
          {sourceUrl ? (
            <Button
              type="button"
              className="sm:flex-1"
              onClick={handleSave}
              disabled={isPending || !area}
            >
              {isPending ? "Uploading..." : "Save"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              className="sm:flex-1"
              onClick={handleRemove}
              disabled={isPending || !avatarUrl}
            >
              <Trash2 />
              {isPending ? "Removing..." : "Remove photo"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
