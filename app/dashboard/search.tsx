
"use client";

import React, { useMemo, useState, useRef } from "react";

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
	const inputRef = useRef<HTMLInputElement | null>(null);

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
		<div className={className}>
			<label htmlFor="dashboard-search" className="sr-only">
				Search
			</label>
			<div className="relative">
				{/* left-side magnifying glass button (click to focus) */}
				<button
					type="button"
					aria-label="Focus search"
					title="Search"
					onClick={() => inputRef.current?.focus()}
					className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/80 flex items-center justify-center cursor-pointer"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" aria-hidden="true" focusable="false">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
					</svg>
				</button>
				<input
					id="dashboard-search"
					type="text"
					ref={inputRef}
					name="dashboard-search-input"
					autoComplete="off"
					spellCheck={false}
					value={query}
					onChange={handleChange}
					placeholder={placeholder}
					maxLength={MAX}
					className="w-full rounded-full bg-white/20 text-white placeholder-transparent pl-10 pr-10 py-2 border border-transparent focus:outline-none focus:ring-0"
					aria-label="Search"
				/>
				{query.length > 0 && (
					<button
						type="button"
						onClick={handleClear}
						aria-label="Clear search"
						title="Clear"
						className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 text-white">
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

