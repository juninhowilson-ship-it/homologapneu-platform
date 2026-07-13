export const VALIDATION_STATUSES = [
  "VALIDADO",
  "NECESSITA_VALIDACAO",
  "REJEITADO",
] as const;

export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  VALIDADO: "Validado",
  NECESSITA_VALIDACAO: "Necessita Validação",
  REJEITADO: "Rejeitado",
};

export const VALIDATION_STATUS_TONE: Record<
  ValidationStatus,
  "success" | "warning" | "danger"
> = {
  VALIDADO: "success",
  NECESSITA_VALIDACAO: "warning",
  REJEITADO: "danger",
};
