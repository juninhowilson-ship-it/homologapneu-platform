"use client";

import { useRef, useState, type FormEvent } from "react";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useUploadMedia } from "@/hooks/useMediaMutations";
import { MEDIA_TYPE_LABELS } from "./mediaLabels";

type Props = {
  open: boolean;
  onClose: () => void;
};

const LINK_FIELDS = [
  { key: "manufacturerId", label: "ID do Fabricante" },
  { key: "vehicleId", label: "ID do Veículo" },
  { key: "tireId", label: "ID do Pneu" },
  { key: "wheelId", label: "ID da Roda" },
  { key: "homologationId", label: "ID da Homologação" },
] as const;

export default function MediaUploadModal({ open, onClose }: Props) {
  const upload = useUploadMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("VEHICLE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});

  function reset() {
    setTitle("");
    setDescription("");
    setSource("");
    setIsPrimary(false);
    setLinkValues({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("type", type);
    if (title) formData.set("title", title);
    if (description) formData.set("description", description);
    if (source) formData.set("source", source);
    if (isPrimary) formData.set("isPrimary", "true");
    for (const field of LINK_FIELDS) {
      if (linkValues[field.key]) formData.set(field.key, linkValues[field.key]);
    }

    upload.mutate(formData, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Enviar imagem" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="mb-2 block font-semibold text-foreground">Arquivo</span>
          <input
            ref={fileInputRef}
            type="file"
            required
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="w-full rounded-lg border border-border bg-surface p-3"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG, JPEG, WEBP ou SVG — até 15MB.
          </p>
        </div>

        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value)}
          hidePlaceholder
          options={Object.entries(MEDIA_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />

        <div className="grid grid-cols-2 gap-4">
          {LINK_FIELDS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              type="number"
              min={1}
              value={linkValues[field.key] ?? ""}
              onChange={(e) =>
                setLinkValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Preencha apenas um ID — o vínculo com a entidade correspondente.
        </p>

        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Fonte (site oficial)"
          placeholder="ex.: site oficial da montadora"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          Definir como imagem principal
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
