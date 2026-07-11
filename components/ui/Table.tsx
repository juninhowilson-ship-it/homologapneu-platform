import {
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-muted text-xs uppercase text-muted-foreground">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="transition hover:bg-surface-muted/60">{children}</tr>;
}

type TableThProps = ThHTMLAttributes<HTMLTableCellElement> & {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
  children: ReactNode;
};

export function TableTh({
  sortable,
  sortDirection,
  onSort,
  children,
  className,
  ...props
}: TableThProps) {
  if (!sortable) {
    return (
      <th className={cn("px-4 py-3 font-semibold", className)} {...props}>
        {children}
      </th>
    );
  }

  return (
    <th className={cn("px-4 py-3 font-semibold", className)} {...props}>
      <button
        type="button"
        onClick={onSort}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {children}
        <span className="text-[10px]">
          {sortDirection === "asc" ? "▲" : sortDirection === "desc" ? "▼" : "⇅"}
        </span>
      </button>
    </th>
  );
}

export function TableTd({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3", className)} {...props}>
      {children}
    </td>
  );
}
