import { Bell, KeyRound, Loader2, ShieldCheck } from "lucide-react";
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
    {
      value: 30,
      label: "30 Days",
      desc: "Strict enterprise compliance",
      badge: "Most Secure",
    },
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
    {
      key: "notify_7d" as const,
      label: "7-day warning",
      desc: "Standard rotation reminder",
    },
    {
      key: "notify_3d" as const,
      label: "3-day warning",
      desc: "Urgent notice for expiring keys",
    },
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
    <div className="p-8 max-w-5xl mx-auto w-full">
      <header className="mb-12">
        <h2 className="text-4xl font-black tracking-tight text-text-primary">Settings</h2>
        <p className="text-text-secondary mt-3 text-lg">
          Manage your project configurations, key policies, and security preferences.
        </p>
      </header>

      <div className="space-y-8">
        {/* Default Key Expiration */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-text-primary">Default Key Expiration</h3>
          </div>
          <p className="text-text-secondary mb-8 leading-relaxed">
            Choose the default lifespan for newly generated API keys. Shorter lifespans are
            recommended for sensitive development environments.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {durations.map((d) => {
              const isSelected = settings?.default_key_duration_days === d.value;
              return (
                <label
                  key={d.value}
                  className={`relative flex cursor-pointer rounded-xl border bg-white/5 p-5 transition-all hover:border-primary/50 ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name="expiry"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => handleDurationChange(d.value)}
                  />
                  <div className="flex w-full items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">{d.label}</span>
                        {d.badge ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" />
                            {d.badge}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-text-secondary mt-1">{d.desc}</span>
                    </div>
                    <div
                      className={`size-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-primary bg-primary" : "border-surface-border"}`}
                    >
                      {isSelected ? <div className="size-2 rounded-full bg-white" /> : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Expiry Alerts */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-text-primary">Expiry Alerts</h3>
          </div>
          <p className="text-text-secondary mb-8 leading-relaxed">
            Configure notification alerts to be sent before an API key expires to ensure
            uninterrupted service.
          </p>
          <div className="space-y-4">
            {notifications.map((n) => {
              const enabled = settings?.[n.key] ?? false;
              return (
                <div
                  key={n.key}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5"
                >
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-text-primary">{n.label}</p>
                    <p className="text-xs text-text-secondary mt-1">{n.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={n.label}
                    onClick={() => handleToggle(n.key, enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
