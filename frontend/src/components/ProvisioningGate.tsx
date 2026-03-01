import { Loader2, Rocket } from "lucide-react";
import type { ReactNode } from "react";
import { useProvision, useProvisionStatus } from "../hooks/useProvisioning";

export function ProvisioningGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useProvisionStatus();
  const provision = useProvision();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  if (data && !data.is_provisioned) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="max-w-md rounded-xl border border-surface-border bg-surface p-8 text-center shadow-lg">
          <Rocket className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-2xl font-semibold text-text-primary">
            Welcome to Apollos AI
          </h2>
          <p className="mt-2 text-text-secondary">
            Your account needs to be provisioned before you can access the
            portal. This will set up your teams and generate API keys based on
            your organization access.
          </p>
          {provision.error ? (
            <p className="mt-3 text-sm text-destructive">
              {String(provision.error)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => provision.mutate()}
            disabled={provision.isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {provision.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Provisioning...
              </>
            ) : (
              "Get Started"
            )}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
