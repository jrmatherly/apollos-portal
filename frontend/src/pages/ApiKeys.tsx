import {
  Copy,
  Plus,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  Columns,
  Check,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const mockApiKeys = [
  {
    id: "1",
    key: "sk-•••••••••8k2",
    alias: "Production-Main",
    team: "Core Engine",
    status: "Active",
    created: "Oct 12, 2023",
    expires: "Never",
    spend: "$1,240.50",
    lastUsed: "2026-02-27T01:10:00-08:00",
  },
  {
    id: "2",
    key: "sk-•••••••••f9w",
    alias: "Dev-Test-Staging",
    team: "Platform Eng",
    status: "Expiring Soon",
    created: "Jan 05, 2024",
    expires: "7 Days",
    spend: "$84.22",
    lastUsed: "2026-02-26T14:30:00-08:00",
  },
  {
    id: "3",
    key: "sk-•••••••••3a1",
    alias: "Analytics-Worker",
    team: "Data Science",
    status: "Active",
    created: "Feb 18, 2024",
    expires: "Mar 2025",
    spend: "$312.00",
    lastUsed: "2026-02-27T00:45:00-08:00",
  },
];

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type SortColumn =
  | "key"
  | "alias"
  | "team"
  | "status"
  | "created"
  | "expires"
  | "lastUsed"
  | "spend";

export function ApiKeys() {
  const [sortConfig, setSortConfig] = useState<{
    key: SortColumn;
    direction: "asc" | "desc";
  }>({
    key: "lastUsed",
    direction: "desc",
  });

  const [visibleColumns, setVisibleColumns] = useState({
    key: true,
    alias: true,
    team: true,
    status: true,
    created: false, // Hidden by default to reduce horizontal scrolling
    expires: true,
    lastUsed: true,
    spend: true,
    actions: true,
  });

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
      setSortConfig({
        key: column,
        direction: "asc",
      });
    }
  };

  const toggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  const sortedKeys = [...mockApiKeys].sort((a, b) => {
    let aValue: any = a[sortConfig.key as keyof typeof a];
    let bValue: any = b[sortConfig.key as keyof typeof b];

    if (sortConfig.key === "lastUsed" || sortConfig.key === "created") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (sortConfig.key === "spend") {
      aValue = parseFloat(aValue.replace(/[^0-9.-]+/g, ""));
      bValue = parseFloat(bValue.replace(/[^0-9.-]+/g, ""));
    }

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
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
      <div
        className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}
      >
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
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            API Keys
          </h1>
          <p className="text-text-secondary mt-1">
            Manage your keys and monitor authentication across your
            organization.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative" ref={dropdownRef}>
            <button
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
                    key={key}
                    onClick={() =>
                      toggleColumn(key as keyof typeof visibleColumns)
                    }
                    className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-border/20 flex items-center justify-between"
                  >
                    <span className="capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    {isVisible && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="bg-primary hover:opacity-90 text-white px-4 py-2.5 rounded-md font-medium transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </div>
      </header>

      <section className="mb-10">
        <div className="bg-surface border border-surface-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-border/10 border-b border-surface-border">
                <tr>
                  {visibleColumns.key && (
                    <SortableHeader column="key" label="Key" />
                  )}
                  {visibleColumns.alias && (
                    <SortableHeader column="alias" label="Alias" />
                  )}
                  {visibleColumns.team && (
                    <SortableHeader column="team" label="Team" />
                  )}
                  {visibleColumns.status && (
                    <SortableHeader column="status" label="Status" />
                  )}
                  {visibleColumns.created && (
                    <SortableHeader column="created" label="Created" />
                  )}
                  {visibleColumns.expires && (
                    <SortableHeader column="expires" label="Expires" />
                  )}
                  {visibleColumns.lastUsed && (
                    <SortableHeader column="lastUsed" label="Last Used" />
                  )}
                  {visibleColumns.spend && (
                    <SortableHeader
                      column="spend"
                      label="Spend"
                      align="right"
                    />
                  )}
                  {visibleColumns.actions && (
                    <th className="px-6 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-widest text-right whitespace-nowrap">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {sortedKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="group hover:bg-surface-border/20 transition-colors"
                  >
                    {visibleColumns.key && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-text-secondary tracking-widest">
                            {key.key}
                          </span>
                          <button
                            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary transition-all"
                            title="Copy Key"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                    {visibleColumns.alias && (
                      <td className="px-6 py-4 text-sm font-medium text-text-primary whitespace-nowrap">
                        {key.alias}
                      </td>
                    )}
                    {visibleColumns.team && (
                      <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                        {key.team}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            key.status === "Active"
                              ? "bg-secondary/10 text-secondary border-secondary/20"
                              : "bg-warning/10 text-warning border-warning/20"
                          }`}
                        >
                          {key.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.created && (
                      <td className="px-6 py-4 text-sm text-text-secondary tabular-nums whitespace-nowrap">
                        {key.created}
                      </td>
                    )}
                    {visibleColumns.expires && (
                      <td className="px-6 py-4 text-sm text-text-secondary tabular-nums whitespace-nowrap">
                        <span
                          className={
                            key.status === "Expiring Soon"
                              ? "text-warning/80 font-medium"
                              : ""
                          }
                        >
                          {key.expires}
                        </span>
                      </td>
                    )}
                    {visibleColumns.lastUsed && (
                      <td className="px-6 py-4 text-sm text-text-secondary tabular-nums whitespace-nowrap">
                        {formatDate(key.lastUsed)}
                      </td>
                    )}
                    {visibleColumns.spend && (
                      <td className="px-6 py-4 text-sm font-mono text-text-primary text-right tabular-nums whitespace-nowrap">
                        {key.spend}
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-6 py-4 text-right space-x-4 whitespace-nowrap">
                        <button className="text-xs text-text-secondary hover:text-primary font-medium transition-colors">
                          Rotate
                        </button>
                        <button className="text-xs text-text-secondary hover:text-destructive font-medium transition-colors">
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

      <section className="pb-20">
        <details className="group border border-surface-border rounded-lg bg-surface-border/10">
          <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-border/20 transition-colors select-none">
            <div className="flex items-center gap-3">
              <ChevronDown className="w-5 h-5 text-text-secondary group-open:rotate-180 transition-transform" />
              <span className="text-sm font-medium text-text-primary">
                Revoked Keys History
              </span>
              <span className="px-1.5 py-0.5 text-[10px] bg-surface-border text-text-secondary rounded-md border border-surface-border">
                12
              </span>
            </div>
          </summary>
          <div className="p-4 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse opacity-70">
                <thead className="border-b border-surface-border bg-surface-border/5">
                  <tr>
                    <th className="py-3 px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                      Key
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                      Alias
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                      Revoked Date
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  <tr className="hover:bg-surface-border/10 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-text-secondary whitespace-nowrap">
                      sk-•••••••x2y
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary whitespace-nowrap">
                      Legacy-Bot
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary tabular-nums whitespace-nowrap">
                      Jan 02, 2024
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary whitespace-nowrap">
                      Compromised
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-border/10 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-text-secondary whitespace-nowrap">
                      sk-•••••••p0l
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary whitespace-nowrap">
                      Temp-Testing
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary tabular-nums whitespace-nowrap">
                      Dec 15, 2023
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary whitespace-nowrap">
                      Expired
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <button className="text-xs text-text-secondary hover:text-text-primary transition-colors underline decoration-surface-border underline-offset-4">
                View full history
              </button>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
