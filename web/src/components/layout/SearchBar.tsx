"use client";

import { Search, X } from "lucide-react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { FormEvent, useRef, useState } from "react";

export default function SearchBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") ?? "";

  return (
    <SearchBarInput
      key={currentSearch}
      initialValue={currentSearch}
      pathname={pathname}
      searchParamsString={searchParams.toString()}
    />
  );
}

function SearchBarInput({
  initialValue,
  pathname,
  searchParamsString,
}: {
  initialValue: string;
  pathname: string;
  searchParamsString: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);

  const buildSearchUrl = (search: string) => {
    const params =
      pathname === "/courses"
        ? new URLSearchParams(searchParamsString)
        : new URLSearchParams();

    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }

    params.delete("page");
    const query = params.toString();

    return `/courses${query ? `?${query}` : ""}`;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildSearchUrl(value.trim()));
  };

  const handleChange = (nextValue: string) => {
    setValue(nextValue);

    if (!nextValue.trim() && initialValue) {
      router.replace(buildSearchUrl(""));
    }
  };

  const clear = () => {
    setValue("");
    inputRef.current?.focus();
    if (initialValue) router.replace(buildSearchUrl(""));
  };

  return (
    <form onSubmit={submit} className="relative w-full max-w-xs">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search courses or instructors..."
        className={`w-full rounded-xl border border-border bg-muted py-2 pl-9 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          value ? "pr-9" : "pr-4"
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
}
