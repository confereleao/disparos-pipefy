'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Wifi, WifiOff } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { WhatsAppIntegration } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

interface Setting { key: string; value: string; label: string | null; group: string | null; }

function groupSettings(settings: Setting[]) {
  return settings.reduce((acc, s) => {
    const g = s.group ?? 'general';
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {} as Record<string, Setting[]>);
}

const GROUP_LABELS: Record<string, string> = {
  rate_limit: 'Limite de Envio',
  schedule: 'Horários Permitidos',
  queue: 'Configurações da Fila',
  pipefy: 'Configurações do Pipefy',
  general: 'Geral',
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [waStatuses, setWaStatuses] = useState<Record<string, { connected: boolean; status: string }>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings = [] } = useQuery<Setting[]>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      const list: Setting[] = res.data.data;
      const initial: Record<string, string> = {};
      list.forEach((s) => { initial[s.key] = s.value; });
      setValues(initial);
      return list;
    },
  });

  const { data: waIntegrations = [] } = useQuery<WhatsAppIntegration[]>({
    queryKey: ['whatsapp'],
    queryFn: async () => (await api.get('/whatsapp')).data.data,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => api.put('/settings', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  async function checkWaStatus(id: string) {
    setCheckingId(id);
    try {
      const res = await api.get(`/whatsapp/${id}/status`);
      setWaStatuses((prev) => ({ ...prev, [id]: res.data.data }));
    } catch {
      setWaStatuses((prev) => ({ ...prev, [id]: { connected: false, status: 'error' } }));
    } finally {
      setCheckingId(null);
    }
  }

  const grouped = groupSettings(settings);

  return (
    <div>
      <Header title="Configurações" subtitle="Gerencie as configurações globais do sistema" />

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✅ Configurações salvas com sucesso!
        </div>
      )}

      <div className="space-y-6">
        {/* Configurações gerais */}
        {Object.entries(grouped).map(([group, items]) => (
          <Card key={group}>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">{GROUP_LABELS[group] ?? group}</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((s) => (
                  <Input
                    key={s.key}
                    label={s.label ?? s.key}
                    value={values[s.key] ?? s.value}
                    onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                  />
                ))}
              </div>
            </CardBody>
          </Card>
        ))}

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate(values)} loading={saveMutation.isPending}>
            <Save className="w-4 h-4" />
            Salvar Configurações
          </Button>
        </div>

        {/* Status WhatsApp */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Status das Integrações WhatsApp</h3>
          </CardHeader>
          <CardBody>
            {waIntegrations.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma integração WhatsApp configurada</p>
            ) : (
              <div className="space-y-3">
                {waIntegrations.map((w) => {
                  const st = waStatuses[w.id];
                  return (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{w.name}</p>
                        <p className="text-xs text-gray-400">{w.provider} — {w.apiUrl}</p>
                        {st && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {st.connected
                              ? <><Wifi className="w-3 h-3 text-green-500" /><span className="text-xs text-green-600">Conectado</span></>
                              : <><WifiOff className="w-3 h-3 text-red-500" /><span className="text-xs text-red-600">Desconectado ({st.status})</span></>
                            }
                          </div>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={checkingId === w.id}
                        onClick={() => checkWaStatus(w.id)}
                      >
                        Verificar
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
