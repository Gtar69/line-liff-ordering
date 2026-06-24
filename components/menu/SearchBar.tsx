"use client";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜尋全部商品"
        aria-label="搜尋全部商品"
        className="h-11 w-full rounded-full border border-neutral-300 bg-neutral-50 pl-10 pr-4 text-base outline-none focus:border-orange-500"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
      >
        🔍
      </span>
    </div>
  );
}
