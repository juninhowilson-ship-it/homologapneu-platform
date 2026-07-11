import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement>;

export default function Skeleton({ className, ...props }: Props) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-surface-muted", className)}
      {...props}
    />
  );
}
