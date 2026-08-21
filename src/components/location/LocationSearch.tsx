"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { getDefaultLocationProvider, type GeocodingResult } from "@/lib/location";
import { cn } from "@/lib/utils";

export interface LocationSearchProps {
  onSelectLocation: (result: GeocodingResult) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Provider-agnostic LocationSearch Component with full theme support.
 * Uses configurable GeocodingProvider (Local Angola dataset / Remote HTTP Geocoding).
 */
export function LocationSearch({
  onSelectLocation,
  placeholder = "Pesquisar província, município ou local em Angola...",
  className,
  autoFocus = false,
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const provider = getDefaultLocationProvider().geocodingProvider;
        const matches = await provider.forward(query, { limit: 8 });
        setResults(matches);
        setIsOpen(matches.length > 0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.name);
    setIsOpen(false);
    onSelectLocation(result);
  };

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-9 py-2.5 bg-input rounded-xl border border-input-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-2xs font-medium"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            aria-label="Limpar pesquisa"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-elevated rounded-2xl border border-border shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-border-subtle animate-in fade-in slide-in-from-top-1">
          {results.map((res) => (
            <button
              key={res.id}
              type="button"
              onClick={() => handleSelect(res)}
              className="w-full px-4 py-2.5 text-left text-xs hover:bg-muted transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="font-bold text-foreground block">{res.name}</span>
                  <span className="text-[11px] text-muted-foreground">{res.formattedAddress}</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-secondary-foreground bg-secondary px-2 py-0.5 rounded-md">
                {res.provinceName || res.countryCode}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
