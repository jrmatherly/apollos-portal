import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface Team {
  team_id: string;
  team_alias: string;
}

interface NewKeyDialogProps {
  open: boolean;
  teams: Team[];
  loading: boolean;
  createdKey?: { key: string; key_alias: string; team_alias: string } | null;
  onSubmit: (teamId: string) => void;
  onCancel: () => void;
}

export function NewKeyDialog({
  open,
  teams,
  loading,
  createdKey,
  onSubmit,
  onCancel,
}: NewKeyDialogProps) {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTeam("");
      setCopied(false);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
          >
            {createdKey ? (
              <>
                <h3 className="text-lg font-semibold text-text-primary">
                  Key Created
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Your new key for <strong>{createdKey.team_alias}</strong> has
                  been created. Copy it now — you won't be able to see it again.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-border bg-black/5 px-3 py-2 text-xs font-mono text-text-primary break-all">
                    {createdKey.key}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdKey.key);
                      setCopied(true);
                    }}
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors inline-flex items-center gap-1.5"
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
                    onClick={onCancel}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-text-primary">
                  Generate New API Key
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Select a team to generate a new API key for.
                </p>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                >
                  <option value="">Select a team...</option>
                  {teams.map((t) => (
                    <option key={t.team_id} value={t.team_id}>
                      {t.team_alias}
                    </option>
                  ))}
                </select>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onSubmit(selectedTeam)}
                    disabled={!selectedTeam || loading}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Generating..." : "Generate Key"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
