import { type ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="bg-surface rounded-xl shadow p-10 text-center">
      <h3 className="text-lg font-bold text-foreground">{title}</h3>

      {description && (
        <p className="mt-2 text-muted-foreground">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
