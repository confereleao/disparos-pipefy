'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageLog, PaginatedResponse, QueueStatus } from '@/types';
import { Header } from '@/components/layout/Header';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'SENT', label: 'Enviados' },
  { value: 'ERROR', label: 'Erros' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', phoneNumber: '', cardId: '', dateFrom: '', dateTo: '' });
  const [detail, setDetail] = useState<MessageLog | null>(null);

  const { data, isLoading } = useQuery<{ data: PaginatedResponse<MessageLog> }>({
    queryKey: ['history', page, filters],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: '50' });
      if (filters.status) p.set('status', filters.status);
      if (filters.phoneNumber) p.set('phoneNumber', filters.phoneNumber);
      if (filters.cardId) p.set('cardId', filters.cardId);
      if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) p.set('dateTo', filters.dateTo);
      return api.get(`/history/logs?${p}`);
    },
    select: (r) => (r as any).data,
  });

  const logs = data?.data?.items ?? [];
  const totalPages = data?.data?.pages ?? 1;
  const total = data?.data?.total ?? 0;

  return (
    <div>
      <Header
        title="Histórico de Envios"
        subtitle={`${total.toLocaleString('pt-BR')} registros totais`}
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          />
          <Input
            label="Telefone"
            placeholder="5511..."
            value={filters.phoneNumber}
            onChange={(e) => setFilters((f) => ({ ...f, phoneNumber: e.target.value }))}
          />
          <Input
            label="ID do Card"
            placeholder="ID Pipefy"
            value={filters.cardId}
            onChange={(e) => setFilters((f) => ({ ...f, cardId: e.target.value }))}
          />
          <Input
            label="Data início"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <Input
            label="Data fim"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setFilters({ status: '', phoneNumber: '', cardId: '', dateFrom: '', dateTo: '' }); setPage(1); }}>
          Limpar filtros
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Card</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pipe / Fase</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Template</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-32">{log.cardTitle ?? log.cardId}</p>
                        <p className="text-xs text-gray-400 font-mono">{log.cardId.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p className="truncate max-w-28">{log.pipeIntegration?.pipeName ?? log.pipeName ?? '—'}</p>
                        {log.phaseName && <p className="text-xs text-gray-400">{log.phaseName}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">{log.phoneNumber}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-28">{log.template?.name ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {format(new Date(log.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetail(log)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
              }
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">Nenhum registro encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalhe */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalhe do Envio" size="lg">
        {detail && (
          <div className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Card</p>
                <p className="font-medium">{detail.cardTitle ?? detail.cardId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <StatusBadge status={detail.status} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Telefone</p>
                <p className="font-mono">{detail.phoneNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Data</p>
                <p>{format(new Date(detail.createdAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">Mensagem enviada</p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="whitespace-pre-line text-gray-700">{detail.messageContent}</p>
              </div>
            </div>

            {detail.errorMessage && (
              <div>
                <p className="text-xs text-red-500 mb-1">Mensagem de erro</p>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-red-700 text-xs font-mono">{detail.errorMessage}</p>
                </div>
              </div>
            )}

            {detail.apiResponse && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Resposta da API</p>
                <pre className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs text-gray-600 overflow-auto max-h-32">
                  {JSON.stringify(detail.apiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
