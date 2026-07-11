"use client";

import Dialog from "./Dialog";
import Button from "./Button";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-muted-foreground">{description}</p>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={
            destructive ? "bg-red-600 text-white hover:bg-red-700" : undefined
          }
        >
          {loading ? "Excluindo..." : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
