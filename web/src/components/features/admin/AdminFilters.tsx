"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATE_PRESETS } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type FilterGroup = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

/** Select ของ Base UI ใช้ค่า "" เป็นตัวเลือกไม่ได้ จึงใช้ค่านี้แทน "ทั้งหมด" */
const ALL = "__all__";

const DATE_KEYS = ["range", "from", "to"];

/**
 * แถบค้นหา/กรองด้านบนตารางหลังบ้าน
 * ช่องค้นหาและ dropdown เป็นตัวเดียวกับฟอร์มฝั่งผู้สอน ขนาดจึงเท่ากันทั้งเว็บ
 */
export default function AdminFilters({
  searchPlaceholder,
  filterGroups,
  dateRange = false,
  actions,
}: {
  searchPlaceholder?: string;
  filterGroups?: FilterGroup[];
  /** ตัวกรองช่วงวันที่ (?range= และ ?from= ?to= ตอนเลือกเอง) */
  dateRange?: boolean;
  /** ปุ่มหลักของหน้า วางชิดขวาในแถวเดียวกับตัวกรอง */
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const filterKeys = [
    "search",
    ...(filterGroups?.map((group) => group.key) ?? []),
    ...(dateRange ? DATE_KEYS : []),
  ];
  const hasActiveFilter = filterKeys.some((key) => searchParams.get(key));
  const range = searchParams.get("range") ?? ALL;

  const pushParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page"); // เปลี่ยนตัวกรอง = กลับไปหน้า 1 เสมอ
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  const setParam = (key: string, value: string) =>
    pushParams((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setParam("search", search.trim());
  };

  const clearAll = () => {
    setSearch("");
    pushParams((params) => filterKeys.forEach((key) => params.delete(key)));
  };

  const setRange = (next: string) =>
    pushParams((params) => {
      // เปลี่ยนช่วงสำเร็จรูป วันที่ที่เคยเลือกเองไม่เกี่ยวแล้ว
      params.delete("from");
      params.delete("to");
      if (next === ALL) params.delete("range");
      else params.set("range", next);
    });

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3">
      {searchPlaceholder && (
        <form onSubmit={submitSearch} className="relative w-full sm:w-80">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-10"
          />
        </form>
      )}

      {filterGroups?.map((group) => {
        const value = searchParams.get(group.key) ?? ALL;
        const labelOf = (optionValue: unknown) =>
          group.options.find((option) => option.value === optionValue)?.label ??
          "All";

        return (
          <Select
            key={group.key}
            value={value}
            onValueChange={(next) =>
              setParam(group.key, next === ALL ? "" : String(next))
            }
          >
            <SelectTrigger
              aria-label={group.label}
              className={cn("min-w-44", value !== ALL && "border-primary/40")}
            >
              <SelectValue>
                {(selected) => `${group.label}: ${labelOf(selected)}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {group.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}

      {dateRange && (
        <>
          <Select
            value={range}
            onValueChange={(next) => setRange(String(next))}
          >
            <SelectTrigger aria-label="Date" className="min-w-44">
              <SelectValue>
                {(selected) =>
                  `Date: ${
                    DATE_PRESETS.find((preset) => preset.value === selected)
                      ?.label ?? "All time"
                  }`
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All time</SelectItem>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {range === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="From"
                value={searchParams.get("from") ?? ""}
                max={searchParams.get("to") ?? undefined}
                onChange={(event) => setParam("from", event.target.value)}
                className="w-auto"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                aria-label="To"
                value={searchParams.get("to") ?? ""}
                min={searchParams.get("from") ?? undefined}
                onChange={(event) => setParam("to", event.target.value)}
                className="w-auto"
              />
            </div>
          )}
        </>
      )}

      {hasActiveFilter && (
        <Button
          type="button"
          variant="ghost"
          onClick={clearAll}
          className="text-muted-foreground"
        >
          <X />
          Clear
        </Button>
      )}

      {actions && <div className="ml-auto">{actions}</div>}
    </div>
  );
}
