import { Bell, KeyRound, Loader2 } from "lucide-react";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";

export function Settings() {
  const { data: settings, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();

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
          <p className="text-red-400">Failed to load settings</p>
          <p className="mt-1 text-sm text-zinc-500">{String(error)}</p>
        </div>
      </div>
    );
  }

  const durations = [
    { value: 30, label: "30 Days", desc: "Strict enterprise compliance", badge: "Most Secure" },
    { value: 60, label: "60 Days", desc: "Standard rotation period" },
    { value: 90, label: "90 Days", desc: "Quarterly rotation" },
    { value: 180, label: "180 Days", desc: "Maximum allowed duration" },
  ];

  const notifications = [
    {
      key: "notify_14d" as const,
      label: "14-day warning",
      desc: "Early notice for key replacement",
    },
    { key: "notify_7d" as const, label: "7-day warning", desc: "Standard rotation reminder" },
    { key: "notify_3d" as const, label: "3-day warning", desc: "Urgent notice for expiring keys" },
    {
      key: "notify_1d" as const,
      label: "1-day final warning",
      desc: "Critical alert for immediate action",
    },
  ];

  const handleDurationChange = (days: number) => {
    updateSettings.mutate({ default_key_duration_days: days });
  };

  const handleToggle = (
    key: "notify_14d" | "notify_7d" | "notify_3d" | "notify_1d",
    currentValue: boolean,
  ) => {
    updateSettings.mutate({ [key]: !currentValue });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <header className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary">Settings</h2>
        <p className="text-text-secondary mt-2">
          Manage your security preferences and notification configurations.
        </p>
      </header>

      <div className="space-y-8">
        {/* Default Key Expiration */}
        <section className="bg-surface border border-surface-border rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
              <KeyRound className="w-5 h-5 text-primary" />
              Default Key Expiration
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Set the mandatory rotation cycle for all generated API keys.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {durations.map((d) => {
              const isSelected = settings?.default_key_duration_days === d.value;
              return (
                <label
                  key={d.value}
                  className={`relative flex items-center p-4 cursor-pointer rounded-md border transition-all group ${
                    isSelected
                      ? "border-primary bg-primary/5 hover:bg-primary/10"
                      : "border-surface-border hover:bg-surface-border/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="expiry"
                    className="w-4 h-4 text-primary border-surface-border focus:ring-primary bg-transparent"
                    checked={isSelected}
                    onChange={() => handleDurationChange(d.value)}
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">{d.label}</span>
                      {d.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider">
                          {d.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">{d.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Email Notifications */}
        <section className="bg-surface border border-surface-border rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
              <Bell className="w-5 h-5 text-primary" />
              Expiry Alerts
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Receive automated warnings before API keys expire.
            </p>
          </div>
          <div className="divide-y divide-surface-border">
            {notifications.map((n) => {
              const enabled = settings?.[n.key] ?? false;
              return (
                <div key={n.key} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{n.label}</p>
                    <p className="text-xs text-text-secondary">{n.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={n.label}
                    onClick={() => handleToggle(n.key, enabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enabled ? "bg-primary" : "bg-surface-border"
                    }`}
                  >
                    <span
                      className={`${
                        enabled ? "translate-x-5" : "translate-x-0"
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
