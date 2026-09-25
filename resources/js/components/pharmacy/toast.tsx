import { CheckCircle, X } from 'lucide-react';
import { useEffect } from 'react';

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
        <div className="animate-in slide-in-from-top-2 fade-in fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-brand-accent bg-white p-4 shadow-lg duration-300 dark:border-brand-accent/60 dark:bg-slate-800 dark:shadow-black/40">
            <CheckCircle className="h-5 w-5 text-brand-accent" />
            <span className="text-sm font-semibold text-brand-text">{message}</span>
            <button
                onClick={onClose}
                className="ml-2 rounded text-brand-text/50 hover:text-brand-text focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
                aria-label="Close notification"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
