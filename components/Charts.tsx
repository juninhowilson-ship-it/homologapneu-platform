'use client';

export function SimpleChart({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map(d => d.value));

  return (
    <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      <h3 className="font-bold text-gray-900 dark:text-white mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#003366] to-[#0052CC] h-full rounded-full transition-all"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: Array<any> }) {
  return (
    <div className="overflow-x-auto rounded-xl border-2 border-gray-200 dark:border-gray-700">
      <table className="w-full">
        <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rows.map((row, i) => (
            <tr key={i} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              {Object.values(row).map((val: any, j) => (
                <td key={j} className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  color = 'blue'
}: {
  icon: any;
  label: string;
  value: string;
  change: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className={`rounded-xl bg-gradient-to-br ${colors[color]} text-white p-6 shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-90">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          <p className="text-xs mt-2 opacity-75">{change}</p>
        </div>
        <Icon className="w-10 h-10 opacity-30" />
      </div>
    </div>
  );
}
