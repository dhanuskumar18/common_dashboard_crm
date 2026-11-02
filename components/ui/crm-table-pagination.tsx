'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

export interface CRMTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function CRMTablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}: CRMTablePaginationProps) {
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPageSizeMenu(false);
      }
    }
    if (showPageSizeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPageSizeMenu]);

  if (totalItems === 0) return null;

  const validTotalPages = Math.max(1, totalPages || Math.ceil(totalItems / pageSize) || 1);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate visible pages (compact)
  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(validTotalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div
      className={`px-4 py-3 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none ${className}`}
    >
      {/* Left: Showing Range */}
      <div className="text-slate-500 font-medium">
        Showing <span className="font-semibold text-slate-700">{startItem}–{endItem}</span> of{' '}
        <span className="font-semibold text-slate-700">{totalItems}</span>
      </div>

      {/* Center: Previous, Page Buttons (Solid Blue for Active), Next */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= validTotalPages}
          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Showing 25 per page Dropdown */}
      <div ref={menuRef} className="relative">
        {onPageSizeChange && (
          <>
            <button
              type="button"
              onClick={() => setShowPageSizeMenu(!showPageSizeMenu)}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              <span>Showing {pageSize} per page</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showPageSizeMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 text-xs">
                {pageSizeOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onPageSizeChange(opt);
                      onPageChange(1);
                      setShowPageSizeMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                      pageSize === opt ? 'text-amber-600 font-bold bg-amber-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{opt} per page</span>
                    {pageSize === opt && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
