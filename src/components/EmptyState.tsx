import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'Belum ada data',
  description = 'Mulai tambahkan data untuk melihat di sini',
  icon,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon || <Inbox className="w-8 h-8 text-slate-300" />}
      </div>
      <h3 className="text-base font-bold text-slate-700">{title}</h3>
      <p className="text-sm text-slate-400 mt-1">{description}</p>
    </div>
  );
}
