"use client";

import { cn } from "@/lib/utils";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

/**
 * ช่องเลือกแบบพิมพ์ค้นหาได้ (ตัวเลือกเยอะเกินกว่าจะไล่หาใน Select ธรรมดา)
 * หน้าตาช่องและรายการตรงกับ Input / Select ของโปรเจกต์
 */
const Combobox = ComboboxPrimitive.Root;

function ComboboxInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.InputGroup className="relative">
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "h-11 w-full min-w-0 rounded-xl border border-border bg-muted py-2.5 pr-11 pl-4 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30",
          className,
        )}
        {...props}
      />
      <ComboboxPrimitive.Trigger
        aria-label="Show options"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground outline-none hover:text-foreground disabled:pointer-events-none"
      >
        <ChevronDownIcon className="size-4" />
      </ComboboxPrimitive.Trigger>
    </ComboboxPrimitive.InputGroup>
  );
}

function ComboboxContent<Item>({
  emptyText = "No results found.",
  children,
}: {
  emptyText?: string;
  /** แปลงแต่ละตัวเลือกเป็น <ComboboxItem> (รายการมาจาก prop items ของ Combobox) */
  children: (item: Item, index: number) => React.ReactNode;
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={6} className="isolate z-50">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className="max-h-[min(var(--available-height),20rem)] w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-xl border border-foreground/10 bg-popover p-1.5 text-popover-foreground shadow-lg duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <ComboboxPrimitive.Empty className="px-3 py-2.5 text-sm text-muted-foreground empty:hidden">
            {emptyText}
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>{children}</ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-1.5 rounded-lg py-2.5 pr-9 pl-3 text-base outline-hidden select-none data-highlighted:bg-secondary data-highlighted:text-primary data-selected:font-semibold data-selected:text-primary",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-3 flex size-4 items-center justify-center text-primary">
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

export { Combobox, ComboboxContent, ComboboxInput, ComboboxItem };
