"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type ComboboxDistributor = {
  id: number;
  name: string;
};

export default function DistributorCombobox({
  name,
  distributors,
  defaultId,
  required = true,
  onSelect,
}: {
  name: string;
  distributors: ComboboxDistributor[];
  defaultId?: number;
  required?: boolean;
  onSelect?: (id: number) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const byId = useMemo(() => new Map(distributors.map((d) => [d.id, d])), [distributors]);

  const [selectedId, setSelectedId] = useState<number | undefined>(defaultId);
  const [query, setQuery] = useState(defaultId ? (byId.get(defaultId)?.name ?? "") : "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return distributors;
    return distributors.filter((d) => d.name.toLowerCase().includes(q));
  }, [distributors, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Snap back to the last confirmed selection's name if the user
        // typed something and clicked away without picking an option.
        const current = selectedId ? byId.get(selectedId) : undefined;
        setQuery(current?.name ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedId, byId]);

  function selectDistributor(d: ComboboxDistributor) {
    setSelectedId(d.id);
    setQuery(d.name);
    setOpen(false);
    onSelect?.(d.id);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedId ?? ""} required={required} />
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listId}
        autoComplete="off"
        placeholder="Type to search distributors..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId(undefined);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            if (open && matches[highlight]) {
              e.preventDefault();
              selectDistributor(matches[highlight]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {matches.map((d, i) => (
            <li key={d.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectDistributor(d)}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === highlight ? "bg-sky-50 text-sky-700" : "hover:bg-slate-50"
                }`}
              >
                {d.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && matches.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-lg">
          No matching distributors
        </div>
      )}
    </div>
  );
}
