import { useEffect } from "react";
import { CheckCircle, X } from "lucide-react";

export interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-grass-green bg-pure-white p-4 shadow-lg animate-in slide-in-from-top-2 fade-in duration-300">
      <CheckCircle className="h-5 w-5 text-grass-green" />
      <span className="text-sm font-semibold text-dark-charcoal">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-dark-charcoal/50 hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue rounded"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
