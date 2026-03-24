import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
            onClick={!loading ? onCancel : undefined}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent bar */}
              <div className={`h-1 w-full ${isDanger ? "bg-red-500" : "bg-amber-400"}`} />

              <div className="p-6">
                {/* Icon + Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isDanger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{description}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 mb-5" />

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                      isDanger
                        ? "bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200"
                        : "bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-200"
                    }`}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
