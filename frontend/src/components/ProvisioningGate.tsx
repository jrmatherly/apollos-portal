import {
  Box,
  Check,
  CircleAlert,
  Copy,
  Key,
  Loader2,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useProvision, useProvisionStatus } from "../hooks/useProvisioning";
import type { ProvisionResponse } from "../types/api";

type Phase = "provisioning" | "showKeys" | "done";

const STEPS = [
  { label: "Validating account", Icon: ShieldCheck },
  { label: "Checking group memberships", Icon: Users },
  { label: "Provisioning for AI proxy", Icon: Rocket },
  { label: "Checking available models", Icon: Box },
  { label: "Generating initial API key", Icon: Key },
] as const;

const STEP_DELAY = 600;

export function ProvisioningGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useProvisionStatus();
  const provision = useProvision();

  const [phase, setPhase] = useState<Phase>("provisioning");
  const [completedSteps, setCompletedSteps] = useState(0);
  const [provisionResult, setProvisionResult] =
    useState<ProvisionResponse | null>(null);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
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
          setPhase("done");
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [completedSteps, provisionResult]);

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
          <p className="text-destructive">
            Failed to check provisioning status
          </p>
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
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg rounded-xl border border-surface-border bg-surface p-8 shadow-lg"
        >
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <Check className="h-6 w-6 text-secondary" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-text-primary">
              You're all set!
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Copy your API key now — you won't be able to see it again.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {keysWithValues.map((keyDetail) => (
              <div
                key={keyDetail.key_id}
                className="rounded-lg border border-border bg-black/5 p-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">
                    {keyDetail.team_alias}
                  </span>
                  <span className="text-text-muted">{keyDetail.key_alias}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-border bg-black/5 px-3 py-2 text-xs font-mono text-text-primary break-all">
                    {keyDetail.key}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(keyDetail.key as string);
                      setCopiedKeys((prev) =>
                        new Set(prev).add(keyDetail.key_id),
                      );
                    }}
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors inline-flex items-center gap-1.5"
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
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setPhase("done")}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Continue to Portal
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Provisioning phase (default for unprovisioned users) ---
  if (data && !data.is_provisioned) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-xl border border-surface-border bg-surface p-8 shadow-lg"
        >
          <div className="text-center">
            <Rocket className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold text-text-primary">
              Setting up your account
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              We're provisioning your access to Apollos AI.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <AnimatePresence>
              {STEPS.map((step, i) => {
                const isCompleted = i < completedSteps;
                const isActive = i === completedSteps && !provision.isError;
                const isPending = i > completedSteps;

                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.2 }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                  >
                    <div className="shrink-0">
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-secondary" />
                      ) : isActive ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <step.Icon className="h-5 w-5 text-text-muted/40" />
                      )}
                    </div>
                    <span
                      className={
                        isCompleted
                          ? "text-sm text-text-primary"
                          : isActive
                            ? "text-sm font-medium text-text-primary"
                            : isPending
                              ? "text-sm text-text-muted/60"
                              : "text-sm text-text-muted"
                      }
                    >
                      {step.label}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

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
                className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
              >
                Retry
              </button>
            </div>
          ) : null}
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
