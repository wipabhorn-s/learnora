"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function CoursesSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");

  const submit = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set("search", value.trim());
    } else {
      params.delete("search");
    }
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex max-w-lg overflow-hidden rounded-xl bg-white shadow-md">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Search courses, instructors..."
        className="flex-1 px-4 py-3 text-sm text-foreground outline-none"
      />
      <button onClick={submit} className="bg-primary px-5 text-white">
        <Search size={18} />
      </button>
    </div>
  );
}
