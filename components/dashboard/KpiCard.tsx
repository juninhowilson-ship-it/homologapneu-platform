import Card from "@/components/ui/Card";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
};

export default function KpiCard({ label, value, hint }: Props) {
  return (
    <Card>
      <h3 className="text-muted-foreground">{label}</h3>
      <p className="mt-3 text-4xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
