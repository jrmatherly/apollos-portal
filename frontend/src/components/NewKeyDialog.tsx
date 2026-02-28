import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface Team {
  team_id: string;
  team_alias: string;
}

interface NewKeyDialogProps {
  open: boolean;
  teams: Team[];
  loading: boolean;
  onSubmit: (teamId: string) => void;
  onCancel: () => void;
}

export function NewKeyDialog({ open, teams, loading, onSubmit, onCancel }: NewKeyDialogProps) {
  const [selectedTeam, setSelectedTeam] = useState("");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-text-primary">Generate New API Key</h3>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
