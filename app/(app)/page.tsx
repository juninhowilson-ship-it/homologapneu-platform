import Card from "@/components/ui/Card";

const stats = [
  { label: "Veículos", value: 0 },
  { label: "Pneus", value: 0 },
  { label: "Homologações", value: 0 },
  { label: "Fabricantes", value: 0 },
];

export default function HomePage() {
  return (
    <main className="p-10">
      <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <h3 className="text-muted-foreground">{stat.label}</h3>
            <p className="text-4xl font-bold mt-3">{stat.value}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
