import { Loader2, Users } from "lucide-react";
import { useTeams } from "../hooks/useTeams";

function getBudgetColor(pct: number): {
  text: string;
  bar: string;
  label: string;
} {
  if (pct >= 85)
    return { text: "text-warning", bar: "bg-warning", label: "Near Limit" };
  if (pct >= 60)
    return { text: "text-primary", bar: "bg-primary", label: "Moderate" };
  return { text: "text-secondary", bar: "bg-secondary", label: "Healthy" };
}

export function Teams() {
  const { data, isLoading, error } = useTeams();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Failed to load teams</p>
          <p className="mt-1 text-sm text-zinc-500">{String(error)}</p>
        </div>
      </div>
    );
  }

  const teams = data?.teams ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">
            Team Management
          </h2>
          <p className="text-text-secondary mt-1">
            View your team allocations and LLM resource usage.
          </p>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Users className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No teams found</p>
          <p className="text-sm mt-1">
            Teams are provisioned based on your organization access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            const spend = team.spend ?? 0;
            const budgetPct =
              team.max_budget > 0
                ? Math.round((spend / team.max_budget) * 100)
                : 0;
            const colors = getBudgetColor(budgetPct);

            return (
              <div
                key={team.team_id}
                className="bg-surface border border-surface-border rounded-xl p-6 flex flex-col group hover:border-primary transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-border/50 px-2 py-1 rounded text-text-secondary">
                    Active
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1 text-text-primary">
                  {team.team_alias}
                </h3>
                {team.member_count != null && (
                  <p className="text-sm text-text-secondary mb-6">
                    {team.member_count} Member
                    {team.member_count !== 1 ? "s" : ""}
                  </p>
                )}

                {team.max_budget > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wide">
                      <span className="text-text-secondary">
                        Budget Utilized
                      </span>
                      <span className={colors.text}>
                        {budgetPct}% ({colors.label})
                      </span>
                    </div>
                    <div className="w-full bg-surface-border/50 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${colors.bar} h-full rounded-full transition-all`}
                        style={{ width: `${Math.min(budgetPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-text-secondary font-mono">
                      <span>${spend.toFixed(2)}</span>
                      <span>${team.max_budget.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {team.models.length > 0 && (
                  <div className="mb-6 flex-1">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">
                      Models Available
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {team.models.map((model) => (
                        <span
                          key={model}
                          className="px-2 py-1 rounded bg-surface-border/30 text-[10px] font-medium text-text-primary"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
