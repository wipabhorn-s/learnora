"use client";

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
import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetSelection = () => {
    setFile(null);
    setPreviewUrl(null);
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

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
  };

  const handleSave = () => {
    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("avatarUrl", file);

      const result = await updateAvatarAction(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }

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
        setError(result.message);
        return;
      }

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
            Choose an image up to 5 MB and preview it before saving.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar className="h-48 w-48 border">
            <AvatarImage
              src={previewUrl ?? avatarUrl ?? undefined}
              alt={`${firstName}'s profile picture`}
            />
            <AvatarFallback className="bg-primary text-6xl font-extrabold text-white">
              {firstName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
            {file ? "Change photo" : "Choose photo"}
          </Button>
          {file ? (
            <Button
              type="button"
              className="sm:flex-1"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? "Uploading ..." : "Save"}
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
              {isPending ? "Removing ..." : "Remove photo"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
