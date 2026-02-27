import { ArrowDown, ArrowUp, Check, ChevronDown, Columns, Key, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useKeys, useRevokeKey, useRotateKey } from "../hooks/useKeys";
import type { KeyListItem } from "../types/api";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatExpiry(item: KeyListItem): string {
  if (item.status === "revoked") return "Revoked";
  if (item.status === "expired") return "Expired";
  if (item.days_until_expiry == null) return "N/A";
  if (item.days_until_expiry <= 0) return "Expired";
  return `${item.days_until_expiry} days`;
}

function statusBadge(status: KeyListItem["status"]) {
  switch (status) {
    case "active":
      return "bg-secondary/10 text-secondary border-secondary/20";
    case "expiring_soon":
      return "bg-warning/10 text-warning border-warning/20";
    case "expired":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "revoked":
    case "rotated":
      return "bg-surface-border/50 text-text-secondary border-surface-border";
  }
}

function statusLabel(status: KeyListItem["status"]): string {
  switch (status) {
    case "active":
      return "Active";
    case "expiring_soon":
      return "Expiring Soon";
    case "expired":
      return "Expired";
    case "revoked":
      return "Revoked";
    case "rotated":
      return "Rotated";
  }
}

type SortColumn = "alias" | "team" | "status" | "created" | "expires" | "spend";

export function ApiKeys() {
  const { data, isLoading, error } = useKeys();
  const rotateKey = useRotateKey();
  const revokeKey = useRevokeKey();

  const [sortConfig, setSortConfig] = useState<{
    key: SortColumn;
    direction: "asc" | "desc";
  }>({
    key: "created",
    direction: "desc",
  });

  const [visibleColumns, setVisibleColumns] = useState({
    alias: true,
    team: true,
    status: true,
    created: false,
    expires: true,
    spend: true,
    actions: true,
  });

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortConfig.key === column) {
      setSortConfig({
        key: column,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSortConfig({ key: column, direction: "asc" });
    }
  };

  const toggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  };

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
          <p className="text-red-400">Failed to load API keys</p>
          <p className="mt-1 text-sm text-zinc-500">{String(error)}</p>
        </div>
      </div>
    );
  }

  const activeKeys = data?.active ?? [];
  const revokedKeys = data?.revoked ?? [];

  const sortedKeys = [...activeKeys].sort((a, b) => {
    let aValue: string | number = "";
    let bValue: string | number = "";

    switch (sortConfig.key) {
      case "alias":
        aValue = a.litellm_key_alias;
        bValue = b.litellm_key_alias;
        break;
      case "team":
        aValue = a.team_alias;
        bValue = b.team_alias;
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "created":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case "expires":
        aValue = a.days_until_expiry ?? 9999;
        bValue = b.days_until_expiry ?? 9999;
        break;
      case "spend":
        aValue = a.last_spend ?? 0;
        bValue = b.last_spend ?? 0;
        break;
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortableHeader = ({
    column,
    label,
    align = "left",
  }: {
    column: SortColumn;
    label: string;
    align?: "left" | "right";
  }) => (
    <th
      className={`group/th px-6 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-surface-border/20 transition-colors select-none ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {label}
        {sortConfig.key === column ? (
          sortConfig.direction === "asc" ? (
            <ArrowUp className="w-3 h-3 text-primary" />
          ) : (
            <ArrowDown className="w-3 h-3 text-primary" />
          )
        ) : (
          <ArrowDown className="w-3 h-3 opacity-0 group-hover/th:opacity-30 transition-opacity" />
        )}
      </div>
    </th>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">API Keys</h1>
          <p className="text-text-secondary mt-1">
            Manage your keys and monitor authentication across your organization.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="bg-surface border border-surface-border hover:bg-surface-border/20 text-text-primary px-4 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Columns className="w-4 h-4" />
              Columns
            </button>
            {showColumnDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-surface-border rounded-lg shadow-xl z-20 py-1">
                {Object.entries(visibleColumns).map(([key, isVisible]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleColumn(key as keyof typeof visibleColumns)}
                    className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-border/20 flex items-center justify-between"
                  >
                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    {isVisible && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {activeKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Key className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No active keys</p>
          <p className="text-sm mt-1">Keys are generated during provisioning.</p>
        </div>
      ) : (
        <section className="mb-10">
          <div className="bg-surface border border-surface-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-border/10 border-b border-surface-border">
                  <tr>
                    {visibleColumns.alias && <SortableHeader column="alias" label="Key Alias" />}
                    {visibleColumns.team && <SortableHeader column="team" label="Team" />}
                    {visibleColumns.status && <SortableHeader column="status" label="Status" />}
                    {visibleColumns.created && <SortableHeader column="created" label="Created" />}
                    {visibleColumns.expires && <SortableHeader column="expires" label="Expires" />}
                    {visibleColumns.spend && (
                      <SortableHeader column="spend" label="Spend" align="right" />
                    )}
                    {visibleColumns.actions && (
                      <th className="px-6 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-widest text-right whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {sortedKeys.map((item) => (
                    <tr
                      key={item.id}
                      className="group hover:bg-surface-border/20 transition-colors"
                    >
                      {visibleColumns.alias && (
                        <td className="px-6 py-4 text-sm font-medium text-text-primary whitespace-nowrap">
                          {item.litellm_key_alias}
                        </td>
                      )}
                      {visibleColumns.team && (
                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                          {item.team_alias}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusBadge(item.status)}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.created && (
                        <td className="px-6 py-4 text-sm text-text-secondary tabular-nums whitespace-nowrap">
                          {formatDate(item.created_at)}
                        </td>
                      )}
                      {visibleColumns.expires && (
                        <td className="px-6 py-4 text-sm text-text-secondary tabular-nums whitespace-nowrap">
                          <span
                            className={
                              item.status === "expiring_soon" ? "text-warning/80 font-medium" : ""
                            }
                          >
                            {formatExpiry(item)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.spend && (
                        <td className="px-6 py-4 text-sm font-mono text-text-primary text-right tabular-nums whitespace-nowrap">
                          {item.last_spend != null ? `$${item.last_spend.toFixed(2)}` : "-"}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4 text-right space-x-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => rotateKey.mutate(item.id)}
                            disabled={rotateKey.isPending}
                            className="text-xs text-text-secondary hover:text-primary font-medium transition-colors disabled:opacity-50"
                          >
                            Rotate
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeKey.mutate(item.id)}
                            disabled={revokeKey.isPending}
                            className="text-xs text-text-secondary hover:text-destructive font-medium transition-colors disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {revokedKeys.length > 0 && (
        <section className="pb-20">
          <details className="group border border-surface-border rounded-lg bg-surface-border/10">
            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-border/20 transition-colors select-none">
              <div className="flex items-center gap-3">
                <ChevronDown className="w-5 h-5 text-text-secondary group-open:rotate-180 transition-transform" />
                <span className="text-sm font-medium text-text-primary">Revoked Keys History</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-surface-border text-text-secondary rounded-md border border-surface-border">
                  {revokedKeys.length}
                </span>
              </div>
            </summary>
            <div className="p-4 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse opacity-70">
                  <thead className="border-b border-surface-border bg-surface-border/5">
                    <tr>
                      <th className="py-3 px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                        Alias
                      </th>
                      <th className="py-3 px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                        Team
                      </th>
                      <th className="py-3 px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                        Status
                      </th>
                      <th className="py-3 px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50">
                    {revokedKeys.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-border/10 transition-colors">
                        <td className="py-3 px-4 text-xs text-text-secondary whitespace-nowrap">
                          {item.litellm_key_alias}
                        </td>
                        <td className="py-3 px-4 text-xs text-text-secondary whitespace-nowrap">
                          {item.team_alias}
                        </td>
                        <td className="py-3 px-4 text-xs text-text-secondary whitespace-nowrap capitalize">
                          {item.status}
                        </td>
                        <td className="py-3 px-4 text-xs text-text-secondary tabular-nums whitespace-nowrap">
                          {formatDate(item.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
