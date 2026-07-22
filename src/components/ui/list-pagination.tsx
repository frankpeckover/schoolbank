"use client";

import { useEffect, useMemo, useState } from "react";

const mobileListPageSize = 15;
const desktopListPageSize = 50;
const mobileMediaQuery = "(max-width: 767px)";

export function usePagedList<Item>(items: Item[]) {
  const pageSize = useResponsiveListPageSize();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;

    return items.slice(startIndex, startIndex + pageSize);
  }, [items, pageSize, safePage]);

  return {
    page: safePage,
    pageItems,
    pageSize,
    setPage,
    totalPages,
  };
}

export function ListPagination({
  onPageChange,
  page,
  totalCount,
  totalPages,
}: {
  onPageChange: (page: number) => void;
  page: number;
  totalCount: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col gap-2 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
      <p className="font-semibold">
        Page {page} of {totalPages} - {totalCount} total
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:flex sm:items-center">
        <button
          className="rounded-md border border-button-border px-3 py-2 font-semibold text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Previous
        </button>
        <label className="sr-only" htmlFor="paginationPage">
          Page
        </label>
        <select
          className="rounded-md border border-button-border bg-surface px-2 py-2 text-center font-semibold text-text-control outline-none ring-brand transition focus:ring-2"
          id="paginationPage"
          onChange={(event) => onPageChange(Number(event.target.value))}
          value={page}
        >
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <option key={pageNumber} value={pageNumber}>
                {pageNumber}
              </option>
            ),
          )}
        </select>
        <button
          className="rounded-md border border-button-border px-3 py-2 font-semibold text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function useResponsiveListPageSize() {
  const [pageSize, setPageSize] = useState(desktopListPageSize);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileMediaQuery);

    function updatePageSize() {
      setPageSize(mediaQuery.matches ? mobileListPageSize : desktopListPageSize);
    }

    updatePageSize();
    mediaQuery.addEventListener("change", updatePageSize);

    return () => {
      mediaQuery.removeEventListener("change", updatePageSize);
    };
  }, []);

  return pageSize;
}
