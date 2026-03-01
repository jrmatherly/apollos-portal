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

  return (
    <AnimatePresence>
      {open ? (
        <dialog
          ref={dialogRef}
          onCancel={onCancel}
          className="fixed inset-0 z-50 m-auto bg-transparent backdrop:bg-black/50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {description ? <p className="mt-2 text-sm text-text-secondary">{description}</p> : null}
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
                onClick={onConfirm}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${confirmColors}`}
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
