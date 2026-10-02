"use client";

import CourseFilters from "@/components/features/course/CourseFilters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COURSE_SORTS,
  FILTER_GROUPS,
  FILTER_KEYS,
} from "@/lib/constants/course-filters";
import { formatCount, formatEnum } from "@/lib/format";
import { useUpdateSearchParams } from "@/lib/hooks/use-update-search-params";
import { SlidersHorizontal, X } from "lucide-react";

/**
 * แถบเหนือรายการคอร์ส แสดงตลอดและสูงคงที่ การ์ดจึงไม่ขยับตอนกรอง
 * ตัวกรองที่เลือกอยู่เป็นป้ายกดลบได้ในแถวเดียวกัน (ล้นแล้วเลื่อนแนวนอน ไม่ขึ้นบรรทัดใหม่)
 */
export default function CourseToolbar({ total }: { total: number }) {
  const { searchParams, set, remove } = useUpdateSearchParams();

  const search = searchParams.get("search");
  const chips = [
    ...(search ? [{ key: "search", label: `"${search}"` }] : []),
    ...FILTER_GROUPS.flatMap((group) => {
      const value = searchParams.get(group.key);
      return value ? [{ key: group.key, label: formatEnum(value) }] : [];
    }),
  ];
  const activeFilterCount = chips.filter(
    (chip) => chip.key !== "search",
  ).length;

  const count = formatCount(total, "course");

  return (
    <div className="flex h-11 items-center gap-3">
      {/* มือถือ: ตัวกรองอยู่ในแผงที่เปิดจากปุ่มนี้ แทนแถบด้านข้าง */}
      <Dialog>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="shrink-0 lg:hidden"
            />
          }
        >
          <SlidersHorizontal />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <CourseFilters />
        </DialogContent>
      </Dialog>

      <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
        <span className="font-semibold text-foreground">{count}</span>
      </p>

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => set(chip.key, null)}
            aria-label={`Remove filter ${chip.label}`}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-secondary px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            {chip.label}
            <X size={14} />
          </button>
        ))}
        {chips.length > 1 && (
          <button
            type="button"
            onClick={() => remove(...FILTER_KEYS)}
            className="shrink-0 px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      <Select
        value={searchParams.get("sort") ?? "newest"}
        onValueChange={(value) =>
          set("sort", value === "newest" ? null : String(value))
        }
      >
        <SelectTrigger aria-label="Sort by" className="shrink-0">
          {/* ซ้อนข้อความทุกตัวเลือกแบบมองไม่เห็นไว้ในช่องเดียวกัน ปุ่มจึงกว้างเท่าตัวเลือก
              ที่ยาวที่สุดเสมอ ไม่ยืดหดตามตัวที่เลือกอยู่ */}
          <span className="grid">
            {COURSE_SORTS.map((sort) => (
              <span
                key={sort.value}
                aria-hidden
                className="invisible col-start-1 row-start-1"
              >
                Sort: {sort.label}
              </span>
            ))}
            <SelectValue className="col-start-1 row-start-1">
              {(value) =>
                `Sort: ${COURSE_SORTS.find((sort) => sort.value === value)?.label ?? "Newest"}`
              }
            </SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent align="end">
          {COURSE_SORTS.map((sort) => (
            <SelectItem key={sort.value} value={sort.value}>
              {sort.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
