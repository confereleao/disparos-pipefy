import { clsx } from 'clsx';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'gray' | 'pending';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-green-100 text-green-800': variant === 'success',
          'bg-red-100 text-red-800': variant === 'error',
          'bg-yellow-100 text-yellow-800': variant === 'warning',
          'bg-blue-100 text-blue-800': variant === 'info',
          'bg-gray-100 text-gray-700': variant === 'gray',
          'bg-orange-100 text-orange-800': variant === 'pending',
        },
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: 'Pendente', variant: 'pending' },
    PROCESSING: { label: 'Processando', variant: 'info' },
    SENT: { label: 'Enviado', variant: 'success' },
    ERROR: { label: 'Erro', variant: 'error' },
    CANCELLED: { label: 'Cancelado', variant: 'gray' },
  };
  const entry = map[status] ?? { label: status, variant: 'gray' as BadgeVariant };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
