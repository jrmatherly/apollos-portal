import {
  ArrowRight,
  Box,
  Check,
  CircleAlert,
  Cloud,
  Copy,
  Download,
  Info,
  Key,
  Loader2,
  Rocket,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  useInvalidateProvisionQueries,
  useProvision,
  useProvisionStatus,
} from "../hooks/useProvisioning";
import type { ProvisionResponse } from "../types/api";

type Phase = "provisioning" | "showKeys" | "done";

const STEPS = [
  {
    label: "Validating account",
    subtitle: "Credentials verified successfully",
    activeHint: "Verifying credentials...",
    Icon: ShieldCheck,
  },
  {
    label: "Checking group memberships",
    subtitle: "Access policies mapped",
    activeHint: "Mapping access policies...",
    Icon: Users,
  },
  {
    label: "Provisioning for AI proxy",
    subtitle: "Secure gateway connection established",
    activeHint: "Establishing gateway connection...",
    Icon: Rocket,
  },
  {
    label: "Checking available models",
    subtitle: "LLM inventory synchronized",
    activeHint: "Synchronizing model inventory...",
    Icon: Box,
  },
  {
    label: "Generating initial API key",
    subtitle: "Authentication layer finalized",
    activeHint: "Finalizing authentication layer...",
    Icon: Key,
  },
] as const;

const STEP_DELAY = 1200;

export function ProvisioningGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useProvisionStatus();
  const provision = useProvision();
  const invalidateProvisionQueries = useInvalidateProvisionQueries();

  const [phase, setPhase] = useState<Phase>("provisioning");
  const [completedSteps, setCompletedSteps] = useState(0);
  const [provisionResult, setProvisionResult] = useState<ProvisionResponse | null>(null);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [keysDownloaded, setKeysDownloaded] = useState(false);
  const provisionTriggered = useRef(false);

  // Auto-trigger provisioning when unprovisioned
  useEffect(() => {
    if (data && !data.is_provisioned && !provisionTriggered.current) {
      provisionTriggered.current = true;
      provision.mutate(undefined, {
        onSuccess: (result) => {
          setProvisionResult(result);
        },
      });
    }
  }, [data, provision]);

  // Animate cosmetic steps 1-4 on timers
  useEffect(() => {
    if (!data || data.is_provisioned) return;
    if (completedSteps >= 4) return;

    const timer = setTimeout(() => {
      setCompletedSteps((prev) => prev + 1);
    }, STEP_DELAY);

    return () => clearTimeout(timer);
  }, [data, completedSteps]);

  // Complete step 5 when API finishes AND steps 1-4 are done
  useEffect(() => {
    if (completedSteps === 4 && provisionResult) {
      const timer = setTimeout(() => {
        setCompletedSteps(5);
      }, STEP_DELAY);
      return () => clearTimeout(timer);
    }
  }, [completedSteps, provisionResult]);

  // Transition to showKeys or done when all steps complete
  useEffect(() => {
    if (completedSteps === 5 && provisionResult) {
      const timer = setTimeout(() => {
        if (
          provisionResult.keys_generated.length > 0 &&
          provisionResult.keys_generated.some((k) => k.key)
        ) {
          setPhase("showKeys");
        } else {
          invalidateProvisionQueries();
          setPhase("done");
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [completedSteps, provisionResult, invalidateProvisionQueries]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- Status fetch error ---
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <p className="text-destructive">Failed to check provisioning status</p>
          <p className="mt-1 text-sm text-text-muted">{String(error)}</p>
        </div>
      </div>
    );
  }

  // --- Already provisioned or done ---
  if (phase === "done" || data?.is_provisioned) {
    return <>{children}</>;
  }

  // --- Show keys phase ---
  if (phase === "showKeys" && provisionResult) {
    const keysWithValues = provisionResult.keys_generated.filter((k) => k.key);
    const allKeysCopied =
      keysWithValues.length > 0 && keysWithValues.every((k) => copiedKeys.has(k.key_id));
    const canContinue = allKeysCopied || keysDownloaded;

    const handleDownloadKeys = () => {
      const lines = keysWithValues.map(
        (k) => `Team: ${k.team_alias}\nKey Alias: ${k.key_alias}\nAPI Key: ${k.key}\n`,
      );
      const content = `Apollos AI API Keys\nGenerated: ${new Date().toISOString()}\n\n${lines.join("\n")}`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "apollos-ai-api-keys.txt";
      a.click();
      URL.revokeObjectURL(url);
      setKeysDownloaded(true);
    };

    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-bg-primary px-4">
        {/* Mesh gradient background */}
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(147, 51, 234, 0.1) 0px, transparent 50%)",
          }}
        />
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[640px] rounded-xl border border-white/10 bg-surface/70 backdrop-blur-md p-8 md:p-12 shadow-2xl"
        >
          {/* Success header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mb-8 ring-8 ring-primary/5">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-text-primary mb-3">
              You're all set!
            </h2>
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-md">
              Your resources have been successfully provisioned and are ready for deployment.
            </p>
          </div>

          {/* Key cards */}
          <div className="space-y-6 mb-10">
            {keysWithValues.map((keyDetail) => (
              <div key={keyDetail.key_id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm font-semibold uppercase tracking-wider">
                    {keyDetail.team_alias}
                  </span>
                  <span className="text-text-muted text-xs">{keyDetail.key_alias}</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="flex-1 rounded-xl border border-white/10 bg-black/20 py-3 px-4 text-text-primary font-mono text-sm break-all">
                    {keyDetail.key}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(keyDetail.key as string);
                      setCopiedKeys((prev) => new Set(prev).add(keyDetail.key_id));
                    }}
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-2.5 text-xs font-medium text-text-secondary hover:bg-white/5 transition-colors inline-flex items-center gap-1.5"
                  >
                    {copiedKeys.has(keyDetail.key_id) ? (
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
                <p className="text-text-muted text-xs mt-2 flex items-center gap-1.5">
                  <Info className="w-3 h-3 shrink-0" />
                  Save this key safely. It will not be shown again.
                </p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              type="button"
              onClick={handleDownloadKeys}
              className="flex-1 h-14 rounded-xl border border-white/10 text-text-secondary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
            >
              <Download className="w-5 h-5" />
              Download All Keys
            </button>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => {
                invalidateProvisionQueries();
                setPhase("done");
              }}
              className={`flex-1 h-14 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                canContinue
                  ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                  : "bg-primary/50 text-white/70 cursor-not-allowed"
              }`}
            >
              Continue to Portal
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          {!canContinue ? (
            <p className="text-xs text-text-muted text-center mt-4">
              Copy or download your keys to continue
            </p>
          ) : null}
        </motion.div>
      </div>
    );
  }

  // --- Provisioning phase (default for unprovisioned users) ---
  if (data && !data.is_provisioned) {
    const progressPct = Math.round((completedSteps / STEPS.length) * 100);

    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-bg-primary px-4">
        {/* Mesh gradient background */}
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(147, 51, 234, 0.1) 0px, transparent 50%)",
          }}
        />
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[580px] rounded-xl border border-white/10 bg-surface/70 backdrop-blur-md p-8 lg:p-12 relative overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Rocket className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-text-primary mb-3">
                Setting up your account
              </h2>
              <p className="text-text-secondary text-base sm:text-lg max-w-sm">
                Please wait while we prepare your AI environment and secure workspace.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-5">
              <AnimatePresence>
                {STEPS.map((step, i) => {
                  const isCompleted = i < completedSteps;
                  const isActive = i === completedSteps && !provision.isError;

                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.2 }}
                      className="flex items-center gap-4"
                    >
                      <div
                        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? "bg-secondary/20 border border-secondary/30"
                            : isActive
                              ? "bg-primary/20 border border-primary/40"
                              : "bg-surface-border/20 border border-surface-border/50"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5 text-secondary" />
                        ) : isActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                          <step.Icon className="h-3.5 w-3.5 text-text-muted/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-base font-medium ${
                            isCompleted || isActive ? "text-text-primary" : "text-text-muted/60"
                          }`}
                        >
                          {step.label}
                        </p>
                        {isCompleted ? (
                          <p className="text-xs text-text-muted">{step.subtitle}</p>
                        ) : isActive ? (
                          <p className="text-xs text-primary/70 animate-pulse">{step.activeHint}</p>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Progress bar */}
            <div className="mt-12 pt-8 border-t border-white/5">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-text-primary text-sm font-semibold">Deployment Status</p>
                  <p className="text-text-muted text-xs">{progressPct}% complete</p>
                </div>
                <span className="text-primary text-sm font-bold tracking-widest uppercase">
                  Provisioning
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)]"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Error state */}
            {provision.isError ? (
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <CircleAlert className="h-4 w-4" />
                  <p className="text-sm">{String(provision.error)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    provisionTriggered.current = false;
                    provision.mutate(undefined, {
                      onSuccess: (result) => {
                        setProvisionResult(result);
                      },
                    });
                  }}
                  className="mt-3 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </motion.div>

          {/* Footer badges */}
          <div className="mt-8 flex items-center gap-6 text-text-muted text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Enterprise Grade Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span>Global Edge Nodes Active</span>
            </div>
          </div>
        </div>

        {/* Bottom glow */}
        <div className="pointer-events-none absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 opacity-20 blur-3xl bg-primary rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
