import { useId, type Ref, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type Option = string | { value: string; label: string };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  ref?: Ref<HTMLSelectElement>;
  label?: string;
  options: Option[];
  placeholder?: string;
  error?: string;
};

type Props = SelectProps;

function normalize(option: Option) {
  return typeof option === "string"
    ? { value: option, label: option }
    : option;
}

export default function Select({
  label,
  options,
  placeholder = "Selecione...",
  error,
  id,
  className,
  ref,
  ...props
}: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={selectId} className="font-semibold text-foreground">
          {label}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        className={cn(
          "w-full rounded-lg border border-border p-3 bg-surface focus:outline-none focus:ring-2 focus:ring-brand",
          error && "border-red-500",
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        <option value="">{placeholder}</option>

        {options.map(normalize).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={`${selectId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
