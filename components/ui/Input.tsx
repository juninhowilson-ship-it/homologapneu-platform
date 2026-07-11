import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, id, className, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="font-semibold text-foreground">
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={cn(
          "w-full rounded-lg border border-border p-3 bg-surface focus:outline-none focus:ring-2 focus:ring-brand",
          error && "border-red-500",
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />

      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
