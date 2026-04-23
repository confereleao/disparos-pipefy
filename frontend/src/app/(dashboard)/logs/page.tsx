'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PaginatedResponse } from '@/types';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  details: unknown;
  user: { name: string; email: string } | null;
}

const RESOURCE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'auth', label: 'Autenticação' },
  { value: 'users', label: 'Usuários' },
  { value: 'pipe_integrations', label: 'Pipes' },
  { value: 'whatsapp_integrations', label: 'WhatsApp' },
  { value: 'automations', label: 'Automações' },
  { value: 'templates', label: 'Templates' },
  { value: 'queue', label: 'Fila' },
];

const ACTION_COLOR: Record<string, string> = {
  LOGIN: 'text-blue-600 bg-blue-50',
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-yellow-600 bg-yellow-50',
  DELETE: 'text-red-600 bg-red-50',
  SYNC: 'text-purple-600 bg-purple-50',
  DISPATCH: 'text-orange-600 bg-orange-50',
};

function getActionColor(action: string) {
  const key = Object.keys(ACTION_COLOR).find((k) => action.startsWith(k));
  return key ? ACTION_COLOR[key] : 'text-gray-600 bg-gray-50';
}

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState('');

  const { data, isLoading } = useQuery<{ data: PaginatedResponse<AuditLog> }>({
    queryKey: ['audit', page, resource],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: '50' });
      if (resource) p.set('resource', resource);
      return api.get(`/history/audit?${p}`);
    },
    select: (r) => (r as any).data,
  });

  const logs = data?.data?.items ?? [];
  const totalPages = data?.data?.pages ?? 1;
  const total = data?.data?.total ?? 0;

  return (
    <div>
      <Header
        title="Logs de Auditoria"
        subtitle={`${total.toLocaleString('pt-BR')} registros`}
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <div className="flex gap-4">
          <div className="w-64">
            <Select
              label="Recurso"
              options={RESOURCE_OPTIONS}
              value={resource}
              onChange={(e) => { setResource(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ação</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Recurso</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [...Array(10)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{log.user?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{log.userEmail ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{log.resource}</td>
                      <td className="px-4 py-3 font-mono text-gray-400 text-xs">{log.resourceId?.slice(0, 8) ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ipAddress ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {format(new Date(log.createdAt), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                      </td>
                    </tr>
                  ))
              }
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">Nenhum log encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
