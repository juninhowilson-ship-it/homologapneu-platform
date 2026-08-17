import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  className?: string;
};

export default function Breadcrumb({ items, className }: Props) {
  return (
    <nav aria-label="Trilha de navegação" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-muted-foreground transition hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      isLast ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <ChevronRight
                  size={14}
                  aria-hidden
                  className="text-muted-foreground"
                />
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
