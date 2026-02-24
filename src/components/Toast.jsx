"use client";

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const base =
          "min-w-[220px] max-w-xs rounded-2xl px-4 py-3 text-xs shadow-lg border flex items-start gap-2";
        const theme = isSuccess
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-rose-50 border-rose-200 text-rose-800";
        return (
          <div key={toast.id} className={`${base} ${theme}`}>
            <div className="mt-0.5">
              {isSuccess ? "✅" : "⚠️"}
            </div>
            <div className="flex-1">
              <div className="font-semibold mb-0.5">
                {toast.title || (isSuccess ? "Success" : "Error")}
              </div>
              <div className="leading-snug">{toast.message}</div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="ml-1 text-[10px] text-slate-600 hover:text-slate-800"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

