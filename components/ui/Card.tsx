import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: Props) {
  return (
    <div
      className={cn("bg-surface rounded-xl shadow p-6", className)}
      {...props}
    />
  );
}
