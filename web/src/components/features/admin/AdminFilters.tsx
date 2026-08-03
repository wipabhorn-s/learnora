"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type FilterGroup = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export default function AdminFilters({
  searchPlaceholder,
  filterGroups,
  className,
}: {
  searchPlaceholder?: string;
  filterGroups?: FilterGroup[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const activeSearch = searchParams.get("search") ?? "";
  const hasActiveFilter =
    Boolean(activeSearch) ||
    Boolean(filterGroups?.some((group) => searchParams.get(group.key)));

  const buildUrl = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page"); // เปลี่ยนตัวกรอง = กลับไปหน้า 1 เสมอ
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = search.trim();
    router.push(
      buildUrl((params) => {
        if (value) params.set("search", value);
        else params.delete("search");
      }),
    );
  };

  const applyFilter = (key: string, value: string) => {
    router.push(
      buildUrl((params) => {
        if (value) params.set(key, value);
        else params.delete(key);
      }),
    );
  };

  const clearAll = () => {
    setSearch("");
    router.push(
      buildUrl((params) => {
        params.delete("search");
        filterGroups?.forEach((group) => params.delete(group.key));
      }),
    );
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {searchPlaceholder && (
        <form onSubmit={submitSearch} className="relative w-full sm:w-72">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </form>
      )}

      {filterGroups?.map((group) => {
        const value = searchParams.get(group.key) ?? "";

        return (
          <div key={group.key} className="relative">
            <select
              value={value}
              onChange={(event) => applyFilter(group.key, event.target.value)}
              className={cn(
                "h-10 cursor-pointer appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20",
                value && "border-primary/40 bg-primary/5 font-medium",
              )}
            >
              <option value="">{group.label}: All</option>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        );
      })}

      {hasActiveFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={14} />
          Clear
        </button>
      )}
    </div>
  );
}
