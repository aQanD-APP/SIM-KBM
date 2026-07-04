import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3 mb-5">
        <div className={`p-2 rounded-xl ${variant === 'danger' ? 'bg-rose-50' : 'bg-amber-50'}`}>
          <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="btn-secondary text-sm">
          {cancelText}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`text-sm px-5 py-2.5 rounded-xl font-semibold text-white transition-all active:scale-95 ${
            variant === 'danger'
              ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-100'
              : 'bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-100'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
