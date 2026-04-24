import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastState = {
  message: string;
  type: 'success' | 'error';
} | null;

type Props = {
  toast: ToastState;
  onClose: () => void;
};

export function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const Icon = toast.type === 'success' ? CheckCircle2 : AlertCircle;
  const colors =
    toast.type === 'success'
      ? 'bg-jd-green-600 border-jd-green-700'
      : 'bg-red-600 border-red-700';

  return (
    <div className="fixed top-5 right-5 z-50 animate-slide-in">
      <div
        className={`${colors} border-l-4 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[280px]`}
      >
        <Icon size={20} />
        <span className="font-medium flex-1">{toast.message}</span>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
