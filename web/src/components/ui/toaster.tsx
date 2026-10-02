"use client";

import {
  dismissToast,
  getToasts,
  subscribeToasts,
  type Toast,
} from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useSyncExternalStore } from "react";

const NO_TOASTS: Toast[] = [];

const STYLE = {
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  error: {
    box: "border-red-200 bg-red-50 text-red-700",
    icon: CircleAlert,
    iconClass: "text-red-600",
  },
} as const;

/** วางครั้งเดียวใน root layout ลอยอยู่มุมขวาบน ไม่กินพื้นที่ของหน้า */
function Toaster() {
  const toasts = useSyncExternalStore(
    subscribeToasts,
    getToasts,
    () => NO_TOASTS,
  );

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((item) => {
        const style = STYLE[item.kind];
        const Icon = style.icon;

        return (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2",
              style.box,
            )}
          >
            <Icon size={18} className={cn("mt-px shrink-0", style.iconClass)} />
            <p className="min-w-0 flex-1 break-words">{item.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="Dismiss notification"
              className="-m-1 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export { Toaster };
