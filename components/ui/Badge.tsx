import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-secondary text-foreground",
  success: "bg-green-950 text-green-400 ring-1 ring-inset ring-green-800",
  warning: "bg-brand/15 text-brand ring-1 ring-inset ring-brand/40",
  danger: "bg-red-950 text-red-400 ring-1 ring-inset ring-red-800",
};

export default function Badge({ tone = "neutral", className, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
