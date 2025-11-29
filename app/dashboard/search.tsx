"use client";

import React, { useMemo, useState } from "react";

type Props = {
	onSearch?: (q: string) => void;
	placeholder?: string;
	className?: string;
	/** Optional list of items to filter and display. If provided, items are assumed to be strings. */
	items?: string[];
	/** Optional renderer for each item. If omitted, the string item is rendered as text. */
	renderItem?: (item: string, index: number) => React.ReactNode;
	/** Max number of results to show (default 10). */
	maxResults?: number;
};

export default function DashboardSearch({
	onSearch,
	placeholder = "Search...",
	className = "",
	items,
	renderItem,
	maxResults = 10,
}: Props) {
	const MAX = 30;
	const [query, setQuery] = useState<string>("");

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const val = e.target.value;
		const next = val.length <= MAX ? val : val.slice(0, MAX);
		setQuery(next);
		onSearch?.(next);
	}

	function handleClear() {
		setQuery("");
		onSearch?.("");
	}

	// Use useMemo to avoid recomputing filter/map on every render unnecessarily
	const results = useMemo(() => {
		if (!items || items.length === 0 || query.trim() === "") return [] as string[];
		const q = query.toLowerCase();
		// .filter to include items containing the query (case-insensitive)
		return items.filter((it) => it.toLowerCase().includes(q)).slice(0, maxResults);
	}, [items, query, maxResults]);

	return (
    <div className={`relative ${className}`}>
      <label htmlFor="dashboard-search" className="sr-only">
        Search
      </label>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-700" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          id="dashboard-search"
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={MAX}
          className="w-full rounded-xl bg-white/30 backdrop-blur-sm text-gray-900 placeholder-gray-600 pl-10 pr-10 py-3 border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            title="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

			{/* character counter removed (hidden on UI) */}

			{/* suggestions removed per user request */}
		</div>
	);
}

