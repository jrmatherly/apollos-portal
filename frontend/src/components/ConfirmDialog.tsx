import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const confirmColors =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-primary hover:bg-primary/90 text-white";

  const iconColors =
    confirmVariant === "danger" ? "bg-red-500/10 text-red-400" : "bg-primary/10 text-primary";

  return (
    <AnimatePresence>
      {open ? (
        <dialog
          ref={dialogRef}
          onCancel={onCancel}
          className="fixed inset-0 z-50 m-auto bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md rounded-xl border border-white/10 bg-surface/90 backdrop-blur-xl p-6 shadow-2xl"
          >
            <div
              className={`size-10 rounded-xl ${iconColors} flex items-center justify-center mb-4`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">{title}</h3>
            {description ? (
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{description}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm font-bold text-text-secondary hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${confirmColors}`}
              >
                {loading ? "..." : String(confirmLabel)}
              </button>
            </div>
          </motion.div>
        </dialog>
      ) : null}
    </AnimatePresence>
  );
}
