import { useId, type InputHTMLAttributes, type Ref } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  ref?: Ref<HTMLInputElement>;
  label?: string;
};

export default function Switch({ label, id, className, ref, ...props }: Props) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  return (
    <label
      htmlFor={switchId}
      className="flex cursor-pointer select-none items-center gap-3"
    >
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          ref={ref}
          id={switchId}
          type="checkbox"
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-border transition peer-checked:bg-brand",
            className
          )}
        />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>

      {label && <span className="font-semibold text-foreground">{label}</span>}
    </label>
  );
}
