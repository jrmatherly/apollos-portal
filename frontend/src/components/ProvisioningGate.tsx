import { Loader2, Rocket } from "lucide-react";
import type { ReactNode } from "react";
import { useProvision, useProvisionStatus } from "../hooks/useProvisioning";

export function ProvisioningGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useProvisionStatus();
  const provision = useProvision();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Failed to check provisioning status</p>
          <p className="mt-1 text-sm text-zinc-500">{String(error)}</p>
        </div>
      </div>
    );
  }

  if (data && !data.is_provisioned) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-xl border border-zinc-700 bg-zinc-800/50 p-8 text-center">
          <Rocket className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-4 text-2xl font-semibold text-white">
            Welcome to Apollos AI
          </h2>
          <p className="mt-2 text-zinc-400">
            Your account needs to be provisioned before you can access the
            portal. This will set up your teams and generate API keys based on
            your organization access.
          </p>
          {provision.error && (
            <p className="mt-3 text-sm text-red-400">
              {String(provision.error)}
            </p>
          )}
          <button
            type="button"
            onClick={() => provision.mutate()}
            disabled={provision.isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
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
