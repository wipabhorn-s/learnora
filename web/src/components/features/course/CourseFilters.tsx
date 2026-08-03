"use client";

import { ACCESS_TYPES, CATEGORIES, LEVELS } from "@/lib/schemas/course.schema";
import { Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const GROUPS = [
  { key: "category", label: "Category", options: CATEGORIES },
  { key: "level", label: "Level", options: LEVELS },
  { key: "accessType", label: "Access Type", options: ACCESS_TYPES },
] as const;

export default function CourseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // เปลี่ยนตัวกรอง = กลับไปหน้า 1 เสมอ

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => {
        const current = searchParams.get(group.key);

        return (
          <div key={group.key}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              {group.key === "category" && <Filter size={14} />}
              {group.label}
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => applyFilter(group.key, null)}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                  !current
                    ? "bg-secondary font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                All
              </button>

              {group.options.map((option) => (
                <button
                  key={option}
                  onClick={() => applyFilter(group.key, option)}
                  className={`w-full rounded-lg px-3 py-1.5 text-left text-sm capitalize transition-colors ${
                    current === option
                      ? "bg-secondary font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {option.replace("_", " ").toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
