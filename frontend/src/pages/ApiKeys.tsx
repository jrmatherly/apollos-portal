import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Columns,
  Copy,
  Key,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { NewKeyDialog } from "../components/NewKeyDialog";
import { useCreateKey, useKeys, useRevokeKey, useRotateKey } from "../hooks/useKeys";
import type { KeyListItem } from "../types/api";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "\u2014";
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

function SortableHeader({
  column,
  label,
  align = "left",
  sortConfig,
  onSort,
}: {
  column: SortColumn;
  label: string;
  align?: "left" | "right";
  sortConfig: { key: SortColumn; direction: "asc" | "desc" };
  onSort: (column: SortColumn) => void;
}) {
  return (
    <th
      className={`group/th px-6 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-surface-border/20 transition-colors select-none ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(column)}
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
}

export function ApiKeys() {
  const keys = useKeys();
  const { data, isLoading, error } = keys;
  const rotateKey = useRotateKey();
  const revokeKey = useRevokeKey();
  const createKey = useCreateKey();

  const [pendingKeyId, setPendingKeyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "rotate" | "revoke";
    keyId: string;
    keyAlias: string;
  } | null>(null);

  const [showNewKey, setShowNewKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<{
    key: string;
    key_alias: string;
    team_alias: string;
  } | null>(null);
  const [rotatedKey, setRotatedKey] = useState<{
    key: string;
    key_alias: string;
  } | null>(null);

  const teams = useMemo(() => {
    if (!keys.data) return [];
    const seen = new Set<string>();
    return [...keys.data.active, ...keys.data.revoked]
      .filter((k) => {
        if (seen.has(k.team_id)) return false;
        seen.add(k.team_id);
        return true;
      })
      .map((k) => ({ team_id: k.team_id, team_alias: k.team_alias }));
  }, [keys.data]);

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

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">API Keys</h1>
          <p className="text-text-secondary mt-1">
            Manage your keys and monitor authentication across your organization.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowNewKey(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Generate New Key
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-expanded={showColumnDropdown}
              aria-haspopup="listbox"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="bg-surface border border-surface-border hover:bg-surface-border/20 text-text-primary px-4 py-2.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Columns className="w-4 h-4" />
              Columns
            </button>
            {showColumnDropdown ? (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-surface-border rounded-lg shadow-xl z-20 py-1">
                {Object.entries(visibleColumns).map(([key, isVisible]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleColumn(key as keyof typeof visibleColumns)}
                    className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-border/20 flex items-center justify-between"
                  >
                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    {isVisible ? <Check className="w-4 h-4 text-primary" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {activeKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Key className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No active keys</p>
          <p className="text-sm mt-1">No API keys found. Generate a new key to get started.</p>
        </div>
      ) : (
        <section className="mb-10">
          <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 border-b border-surface-border">
                  <tr>
                    {visibleColumns.alias ? (
                      <SortableHeader
                        column="alias"
                        label="Key Alias"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    ) : null}
                    <th className="px-6 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                      Secret Key
                    </th>
                    {visibleColumns.team ? (
                      <SortableHeader
                        column="team"
                        label="Team"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    ) : null}
                    {visibleColumns.status ? (
                      <SortableHeader
                        column="status"
                        label="Status"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    ) : null}
                    {visibleColumns.created ? (
                      <SortableHeader
                        column="created"
                        label="Created"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    ) : null}
                    {visibleColumns.expires ? (
                      <SortableHeader
                        column="expires"
                        label="Expires"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    ) : null}
                    {visibleColumns.spend ? (
                      <SortableHeader
                        column="spend"
                        label="Spend"
                        align="right"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    ) : null}
                    {visibleColumns.actions ? (
                      <th className="px-6 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-widest text-right whitespace-nowrap">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {sortedKeys.map((item) => (
                    <tr
                      key={item.id}
                      className="group hover:bg-surface-border/20 transition-colors"
                    >
                      {visibleColumns.alias ? (
                        <td className="px-6 py-4 text-sm font-medium text-text-primary whitespace-nowrap">
                          {item.litellm_key_alias}
                        </td>
                      ) : null}
                      <td className="px-6 py-4 text-xs font-mono text-text-secondary whitespace-nowrap">
                        {item.key_preview ?? "—"}
                      </td>
                      {visibleColumns.team ? (
                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                          {item.team_alias}
                        </td>
                      ) : null}
                      {visibleColumns.status ? (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusBadge(item.status)}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </td>
                      ) : null}
                      {visibleColumns.created ? (
                        <td className="px-6 py-4 text-sm text-text-secondary tabular-nums whitespace-nowrap">
                          {formatDate(item.created_at)}
                        </td>
                      ) : null}
                      {visibleColumns.expires ? (
                        <td className="px-6 py-4 text-sm text-text-secondary tabular-nums whitespace-nowrap">
                          <span
                            className={
                              item.status === "expiring_soon" ? "text-warning/80 font-medium" : ""
                            }
                          >
                            {formatExpiry(item)}
                          </span>
                        </td>
                      ) : null}
                      {visibleColumns.spend ? (
                        <td className="px-6 py-4 text-sm font-mono text-text-primary text-right tabular-nums whitespace-nowrap">
                          {item.last_spend != null ? `$${item.last_spend.toFixed(2)}` : "-"}
                        </td>
                      ) : null}
                      {visibleColumns.actions ? (
                        <td className="px-6 py-4 text-right space-x-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                type: "rotate",
                                keyId: item.id,
                                keyAlias: item.litellm_key_alias,
                              })
                            }
                            disabled={pendingKeyId === item.id}
                            className="text-xs text-text-secondary hover:text-primary font-medium transition-colors disabled:opacity-50"
                          >
                            Rotate
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                type: "revoke",
                                keyId: item.id,
                                keyAlias: item.litellm_key_alias,
                              })
                            }
                            disabled={pendingKeyId === item.id}
                            className="text-xs text-text-secondary hover:text-destructive font-medium transition-colors disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {revokedKeys.length > 0 ? (
        <section className="pb-20">
          <details className="group border border-surface-border rounded-xl bg-surface-border/10">
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
      ) : null}
      <NewKeyDialog
        open={showNewKey}
        teams={teams}
        loading={createKey.isPending}
        createdKey={createdKey}
        onSubmit={(teamId) => {
          createKey.mutate(teamId, {
            onSuccess: (data) => {
              setCreatedKey({
                key: data.key,
                key_alias: data.key_alias,
                team_alias: data.team_alias,
              });
            },
          });
        }}
        onCancel={() => {
          setShowNewKey(false);
          setCreatedKey(null);
        }}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === "revoke" ? "Revoke API Key" : "Rotate API Key"}
        description={
          confirmAction?.type === "revoke"
            ? `This will permanently disable key "${confirmAction.keyAlias}". This cannot be undone.`
            : `This will generate a new key to replace "${confirmAction?.keyAlias}". The old key will stop working immediately.`
        }
        confirmLabel={confirmAction?.type === "revoke" ? "Revoke" : "Rotate"}
        confirmVariant={confirmAction?.type === "revoke" ? "danger" : "primary"}
        loading={rotateKey.isPending || revokeKey.isPending}
        onConfirm={() => {
          if (!confirmAction) return;
          setPendingKeyId(confirmAction.keyId);
          const onSettled = () => {
            setPendingKeyId(null);
            setConfirmAction(null);
          };
          if (confirmAction.type === "revoke") {
            revokeKey.mutate(confirmAction.keyId, { onSettled });
          } else {
            rotateKey.mutate(confirmAction.keyId, {
              onSuccess: (data) => {
                setRotatedKey({
                  key: data.new_key,
                  key_alias: data.new_key_alias,
                });
              },
              onSettled: () => {
                setPendingKeyId(null);
                setConfirmAction(null);
              },
            });
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <RotatedKeyDialog rotatedKey={rotatedKey} onClose={() => setRotatedKey(null)} />
    </div>
  );
}

function RotatedKeyDialog({
  rotatedKey,
  onClose,
}: {
  rotatedKey: { key: string; key_alias: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (rotatedKey) setCopied(false);
  }, [rotatedKey]);

  return (
    <AnimatePresence>
      {rotatedKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md rounded-xl border border-white/10 bg-surface/90 backdrop-blur-xl p-6 shadow-2xl"
          >
            <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
              <RefreshCw className="w-5 h-5 text-secondary" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Key Rotated</h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Your new key <strong>{rotatedKey.key_alias}</strong> is ready. Copy it now — you won't
              be able to see it again.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-mono text-text-primary break-all">
                {rotatedKey.key}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(rotatedKey.key);
                  setCopied(true);
                }}
                className="shrink-0 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-text-secondary hover:bg-white/10 transition-colors inline-flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-secondary" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
