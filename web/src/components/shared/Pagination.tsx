import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  getPageHref: (page: number) => string;
  ariaLabel?: string;
};

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export default function Pagination({
  currentPage,
  totalPages,
  getPageHref,
  ariaLabel = "Pagination",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <nav
      aria-label={ariaLabel}
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        <Link
          href={getPageHref(currentPage - 1)}
          aria-label="Previous page"
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <ChevronLeft size={18} />
        </Link>
      ) : (
        <span className="flex size-10 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground/40">
          <ChevronLeft size={18} />
        </span>
      )}

      {pages.map((page, index) => {
        const previousPage = pages[index - 1];
        const showEllipsis = previousPage && page - previousPage > 1;

        return (
          <span key={page} className="contents">
            {showEllipsis && (
              <span className="flex size-10 items-center justify-center text-muted-foreground">
                …
              </span>
            )}
            <Link
              href={getPageHref(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={`flex size-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                page === currentPage
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
              }`}
            >
              {page}
            </Link>
          </span>
        );
      })}

      {currentPage < totalPages ? (
        <Link
          href={getPageHref(currentPage + 1)}
          aria-label="Next page"
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <ChevronRight size={18} />
        </Link>
      ) : (
        <span className="flex size-10 cursor-not-allowed items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground/40">
          <ChevronRight size={18} />
        </span>
      )}
    </nav>
  );
}
