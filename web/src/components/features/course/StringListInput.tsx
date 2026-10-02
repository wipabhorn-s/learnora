"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

/**
 * รายการข้อความทีละบรรทัด (What you'll learn / Requirements)
 * มีช่องว่างไว้ให้พิมพ์อย่างน้อยหนึ่งช่องเสมอ ช่องที่ว่างจะถูกทิ้งตอนบันทึก
 */
export default function StringListInput({
  id,
  value,
  onChange,
  placeholder,
  addLabel,
  maxItems,
  maxLength,
  disabled,
  invalid,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  addLabel: string;
  maxItems: number;
  maxLength: number;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const items = value.length > 0 ? value : [""];

  const update = (index: number, text: string) =>
    onChange(items.map((item, i) => (i === index ? text : item)));

  const remove = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            id={index === 0 ? id : undefined}
            value={item}
            onChange={(event) => update(index, event.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            aria-invalid={invalid && item.length > maxLength}
            aria-label={`${addLabel.replace(/^Add /, "")} ${index + 1}`}
          />
          {items.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label={`Remove item ${index + 1}`}
              className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X size={18} />
            </Button>
          )}
        </div>
      ))}

      {items.length < maxItems && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange([...items, ""])}
          disabled={disabled}
          className="justify-self-start px-2 text-primary hover:text-primary"
        >
          <Plus size={16} />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
