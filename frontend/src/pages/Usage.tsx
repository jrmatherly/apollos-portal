import { Calendar, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useUsage } from "../hooks/useUsage";

function getDateRange(range: string): { startDate?: string; endDate?: string } {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export function Usage() {
  const [dateRange, setDateRange] = useState("30d");
  const params = useMemo(() => getDateRange(dateRange), [dateRange]);
  const { data, isLoading, error } = useUsage(params);

  // Pivot data points by date for chart: { date, model1: spend, model2: spend, ... }
  const { chartData, modelNames } = useMemo(() => {
    if (!data?.data) return { chartData: [], modelNames: [] as string[] };

    const dateMap = new Map<string, Record<string, number>>();
    const models = new Set<string>();

    for (const dp of data.data) {
      models.add(dp.model);
      const existing = dateMap.get(dp.date) ?? {};
      existing[dp.model] = (existing[dp.model] ?? 0) + dp.spend;
      dateMap.set(dp.date, existing);
    }

    const sortedDates = [...dateMap.keys()].sort();
    const chartData = sortedDates.map((date) => ({
      date,
      ...dateMap.get(date),
    }));

    return { chartData, modelNames: [...models] };
  }, [data]);

  // Aggregate per-model breakdown
  const modelBreakdown = useMemo(() => {
    if (!data?.data) return [];
    const agg = new Map<string, { input_tokens: number; output_tokens: number; spend: number }>();
    for (const dp of data.data) {
      const existing = agg.get(dp.model) ?? {
        input_tokens: 0,
        output_tokens: 0,
        spend: 0,
      };
      existing.input_tokens += dp.input_tokens;
      existing.output_tokens += dp.output_tokens;
      existing.spend += dp.spend;
      agg.set(dp.model, existing);
    }
    return [...agg.entries()]
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.spend - a.spend);
  }, [data]);

  const chartColors = [
    "var(--primary)",
    "var(--secondary)",
    "var(--warning)",
    "#a855f7",
    "#f43f5e",
    "#06b6d4",
  ];

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Failed to load usage data</p>
          <p className="mt-1 text-sm text-zinc-500">{String(error)}</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <header className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-text-primary">Usage Analytics</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none pl-9 pr-8 py-1.5 bg-surface border border-surface-border rounded-md text-sm font-medium text-text-secondary hover:bg-surface-border/50 transition-all focus:ring-primary focus:border-primary outline-none cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-surface-border p-6 rounded-xl">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">
            Total Spend
          </p>
          {isLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-32 mt-1" />
          ) : (
            <p className="text-3xl font-bold font-mono text-text-primary">
              ${summary?.total_spend.toFixed(2) ?? "0.00"}
            </p>
          )}
        </div>
        <div className="bg-surface border border-surface-border p-6 rounded-xl">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">
            Total Tokens
          </p>
          {isLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-32 mt-1" />
          ) : (
            <p className="text-3xl font-bold font-mono text-text-primary">
              {(summary?.total_tokens ?? 0).toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-surface border border-surface-border p-6 rounded-xl">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">
            Total Requests
          </p>
          {isLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-32 mt-1" />
          ) : (
            <p className="text-3xl font-bold font-mono text-text-primary">
              {(summary?.total_requests ?? 0).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Spend Chart */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">
              Spend Over Time
            </h3>
          </div>
          <div className="flex items-center gap-4">
            {modelNames.slice(0, 6).map((model, i) => (
              <div key={model} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: chartColors[i % chartColors.length] }}
                />
                <span className="text-xs text-text-secondary">{model}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-surface-border/5 rounded-lg animate-pulse">
              <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">
              No usage data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  {modelNames.slice(0, 6).map((model, i) => (
                    <linearGradient key={model} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={chartColors[i % chartColors.length]}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={chartColors[i % chartColors.length]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--surface-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--surface-border)",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "var(--text-primary)" }}
                />
                {modelNames.slice(0, 6).map((model, i) => (
                  <Area
                    key={model}
                    type="monotone"
                    dataKey={model}
                    stroke={chartColors[i % chartColors.length]}
                    fillOpacity={1}
                    fill={`url(#color-${i})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Model Breakdown Table */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-surface-border">
          <h3 className="font-bold text-text-primary">Model Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-border/10 border-b border-surface-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  Model
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">
                  Input Tokens
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">
                  Output Tokens
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-surface-border/30">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-surface-border/20 rounded animate-pulse w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-surface-border/20 rounded animate-pulse w-20 ml-auto" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-surface-border/20 rounded animate-pulse w-20 ml-auto" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-surface-border/20 rounded animate-pulse w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : modelBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                    No usage data
                  </td>
                </tr>
              ) : (
                modelBreakdown.map((row, i) => (
                  <tr key={row.model} className="hover:bg-surface-border/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: chartColors[i % chartColors.length],
                          }}
                        />
                        <span className="text-sm font-medium text-text-primary">{row.model}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text-secondary">
                      {row.input_tokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-text-secondary">
                      {row.output_tokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-text-primary">
                      ${row.spend.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
