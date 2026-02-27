import { TrendingUp, Clock, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { useKeys } from "../hooks/useKeys";
import { useTeams } from "../hooks/useTeams";
import { useUsage } from "../hooks/useUsage";

export function Dashboard() {
  const keysQuery = useKeys();
  const teamsQuery = useTeams();
  const usageQuery = useUsage();

  const isLoading =
    keysQuery.isLoading || teamsQuery.isLoading || usageQuery.isLoading;

  // Derive dashboard stats
  const activeKeyCount = keysQuery.data?.active?.length ?? 0;
  const teamsCount = teamsQuery.data?.teams?.length ?? 0;
  const totalSpend = usageQuery.data?.summary?.total_spend ?? 0;
  const totalTokens = usageQuery.data?.summary?.total_tokens ?? 0;

  // Find the next expiring key
  const nextExpiry = useMemo(() => {
    const active = keysQuery.data?.active ?? [];
    const expiring = active
      .filter((k) => k.days_until_expiry != null && k.days_until_expiry > 0)
      .sort((a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0));
    return expiring[0] ?? null;
  }, [keysQuery.data]);

  // Build chart data from usage: aggregate spend by date
  const { chartData, modelNames } = useMemo(() => {
    if (!usageQuery.data?.data)
      return { chartData: [], modelNames: [] as string[] };

    const dateMap = new Map<string, Record<string, number>>();
    const models = new Set<string>();

    for (const dp of usageQuery.data.data) {
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
  }, [usageQuery.data]);

  const totalBudget = useMemo(() => {
    return (teamsQuery.data?.teams ?? []).reduce(
      (sum, t) => sum + (t.max_budget ?? 0),
      0,
    );
  }, [teamsQuery.data]);

  const spendPct =
    totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;

  const chartColors = [
    "var(--primary)",
    "var(--secondary)",
    "var(--warning)",
    "#a855f7",
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Dashboard Overview
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Real-time usage and infrastructure health.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active Keys */}
        <div className="bg-surface border border-surface-border rounded-lg p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-text-secondary">
              Active Keys
            </span>
            <div className="flex items-center gap-1.5 bg-secondary/10 px-2 py-1 rounded-full border border-secondary/20">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-secondary tracking-wider">
                Live
              </span>
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-9 bg-surface-border/20 rounded animate-pulse w-16" />
            ) : (
              <>
                <span className="text-3xl font-bold font-mono text-text-primary">
                  {activeKeyCount}
                </span>
                <p className="text-xs text-text-secondary mt-1">
                  Across {teamsCount} team{teamsCount !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Current Spend */}
        <div className="bg-surface border border-surface-border rounded-lg p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-text-secondary">
              Current Spend
            </span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          {isLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-32" />
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold font-mono text-text-primary">
                  ${totalSpend.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </span>
                {totalBudget > 0 && (
                  <span className="text-xs text-text-secondary font-mono">
                    / ${totalBudget.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  </span>
                )}
              </div>
              {totalBudget > 0 && (
                <div className="mt-4 h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(spendPct, 100)}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Total Tokens */}
        <div className="bg-surface border border-surface-border rounded-lg p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-text-secondary">
              Total Tokens
            </span>
          </div>
          {isLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-24" />
          ) : (
            <span className="text-3xl font-bold font-mono text-text-primary">
              {totalTokens >= 1_000_000
                ? `${(totalTokens / 1_000_000).toFixed(1)}M`
                : totalTokens >= 1_000
                  ? `${(totalTokens / 1_000).toFixed(1)}K`
                  : totalTokens.toLocaleString()}
            </span>
          )}
        </div>

        {/* Next Expiry */}
        <div className="bg-surface border border-surface-border rounded-lg p-5">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-text-secondary">
              Next Expiry
            </span>
            <Clock className="w-5 h-5 text-text-secondary" />
          </div>
          {isLoading ? (
            <div className="h-9 bg-surface-border/20 rounded animate-pulse w-24" />
          ) : nextExpiry ? (
            <div className="mt-1">
              <div className="inline-flex items-center px-3 py-1 rounded-md bg-warning/10 border border-warning/20 text-warning mb-2">
                <span className="text-lg font-bold font-mono">
                  {nextExpiry.days_until_expiry}d
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Key:{" "}
                <span className="font-mono text-text-primary">
                  {nextExpiry.litellm_key_alias}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No expiring keys</p>
          )}
        </div>
      </div>

      {/* Spend Chart */}
      <div className="bg-surface border border-surface-border rounded-lg flex-1 flex flex-col overflow-hidden h-[400px]">
        <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-primary">
            Daily Spend
          </h2>
          <div className="flex items-center gap-6">
            {modelNames.slice(0, 4).map((model, i) => (
              <div key={model} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: chartColors[i % chartColors.length],
                  }}
                />
                <span className="text-xs text-text-secondary">{model}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">
              No usage data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {modelNames.slice(0, 4).map((model, i) => (
                    <linearGradient
                      key={model}
                      id={`dashColor${i}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
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
                {modelNames.slice(0, 4).map((model, i) => (
                  <Area
                    key={model}
                    type="monotone"
                    dataKey={model}
                    stroke={chartColors[i % chartColors.length]}
                    fillOpacity={1}
                    fill={`url(#dashColor${i})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
