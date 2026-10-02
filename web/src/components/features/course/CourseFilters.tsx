"use client";

import { FILTER_GROUPS } from "@/lib/constants/course-filters";
import { formatEnum } from "@/lib/format";
import { useUpdateSearchParams } from "@/lib/hooks/use-update-search-params";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

/**
 * รายการตัวกรองแบบเลือกได้ข้อเดียวต่อกลุ่ม (เหมือน radio)
 * กดข้อที่เลือกอยู่ซ้ำ = ยกเลิก จึงไม่ต้องมีตัวเลือก "All"
 * ใช้ทั้งแถบด้านข้างบนจอใหญ่ และในแผงตัวกรองบนมือถือ
 */
export default function CourseFilters() {
  const { searchParams, set } = useUpdateSearchParams();
  // เปิดทุกกลุ่มไว้ก่อน ผู้ใช้พับเองได้ถ้าไม่ใช้
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="divide-y">
      {FILTER_GROUPS.map((group) => {
        const current = searchParams.get(group.key);
        const open = !collapsed.has(group.key);
        const panelId = `filter-${group.key}`;

        return (
          <section key={group.key} className="py-3 first:pt-0 last:pb-0">
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex w-full items-center justify-between rounded-lg py-1.5 text-sm font-bold"
            >
              {group.label}
              <ChevronDown
                size={16}
                className={cn(
                  "text-muted-foreground transition-transform",
                  !open && "-rotate-90",
                )}
              />
            </button>

            {open && (
              <div
                id={panelId}
                role="radiogroup"
                aria-label={group.label}
                className="mt-1 space-y-0.5"
              >
                {group.options.map((option) => {
                  const selected = current === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set(group.key, selected ? null : option)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                        selected
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-primary" : "border-border",
                        )}
                      >
                        {selected && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </span>
                      {formatEnum(option)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
