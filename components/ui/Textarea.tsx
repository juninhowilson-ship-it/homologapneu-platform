import { useId, type Ref, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>;
  label?: string;
  error?: string;
};

export default function Textarea({
  label,
  error,
  id,
  className,
  ref,
  ...props
}: Props) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={textareaId} className="font-semibold text-foreground">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "w-full rounded-lg border border-border p-3 bg-surface focus:outline-none focus:ring-2 focus:ring-brand",
          error && "border-red-500",
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />

      {error && (
        <p id={`${textareaId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
