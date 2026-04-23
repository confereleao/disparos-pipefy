'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Wifi, WifiOff, Send } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { WhatsAppIntegration } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

const schema = z.object({
  name: z.string().min(1),
  provider: z.string().default('evolution'),
  apiUrl: z.string().url('URL inválida'),
  apiKey: z.string().min(1),
  instanceName: z.string().optional(),
});

const testSchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1),
});

type FormData = z.infer<typeof schema>;
type TestData = z.infer<typeof testSchema>;

const PROVIDERS = [
  { value: 'evolution', label: 'Evolution API' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'z-api', label: 'Z-API' },
];

export default function WhatsAppPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<WhatsAppIntegration | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statuses, setStatuses] = useState<Record<string, { connected: boolean; status: string }>>({});

  const { data: integrations = [], isLoading } = useQuery<WhatsAppIntegration[]>({
    queryKey: ['whatsapp'],
    queryFn: async () => (await api.get('/whatsapp')).data.data,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const testForm = useForm<TestData>({ resolver: zodResolver(testSchema) });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editItem) return api.put(`/whatsapp/${editItem.id}`, data);
      return api.post('/whatsapp', data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whatsapp'] }); setShowModal(false); reset(); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/whatsapp/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp'] }),
  });

  const testMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TestData }) =>
      (await api.post(`/whatsapp/${id}/test`, data)).data,
    onSuccess: (res) => {
      alert(res.data?.success ? '✅ Mensagem enviada!' : `❌ Erro: ${res.data?.error}`);
      setTestId(null);
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  async function checkStatus(id: string) {
    try {
      const res = await api.get(`/whatsapp/${id}/status`);
      setStatuses((prev) => ({ ...prev, [id]: res.data.data }));
    } catch {
      setStatuses((prev) => ({ ...prev, [id]: { connected: false, status: 'error' } }));
    }
  }

  function openCreate() {
    setEditItem(null);
    reset({ provider: 'evolution' });
    setError('');
    setShowModal(true);
  }

  function openEdit(w: WhatsAppIntegration) {
    setEditItem(w);
    reset({ name: w.name, provider: w.provider, apiUrl: w.apiUrl, apiKey: '', instanceName: w.instanceName ?? '' });
    setError('');
    setShowModal(true);
  }

  return (
    <div>
      <Header
        title="Integrações WhatsApp"
        subtitle="Configure os provedores de WhatsApp para envio de mensagens"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Nova Integração</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : integrations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-2">Nenhuma integração configurada</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4" />Adicionar Integração</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map((w) => {
            const st = statuses[w.id];
            return (
              <div key={w.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{w.name}</h3>
                      {w.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="gray">Inativo</Badge>}
                      {st && (
                        <span className={`flex items-center gap-1 text-xs ${st.connected ? 'text-green-600' : 'text-red-500'}`}>
                          {st.connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                          {st.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{PROVIDERS.find((p) => p.value === w.provider)?.label ?? w.provider}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{w.apiUrl}</p>
                    {w.instanceName && <p className="text-xs text-gray-400">Instância: {w.instanceName}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => checkStatus(w.id)}>
                      <Wifi className="w-3.5 h-3.5" />Status
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setTestId(w.id); testForm.reset(); }}>
                      <Send className="w-3.5 h-3.5" />Testar
                    </Button>
                    <button onClick={() => openEdit(w)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Edit2 className="w-4 h-4" /></button>
                    <button
                      onClick={() => window.confirm('Remover integração?') && deleteMutation.mutate(w.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                    ><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Editar Integração' : 'Nova Integração WhatsApp'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <Input label="Nome" error={errors.name?.message} {...register('name')} />
          <Select label="Provedor" options={PROVIDERS} {...register('provider')} />
          <Input label="URL da API" type="url" placeholder="https://api.evolution.local" error={errors.apiUrl?.message} {...register('apiUrl')} />
          <Input label="API Key" type="password" placeholder={editItem ? '(manter atual)' : 'Chave de acesso'} error={errors.apiKey?.message} {...register('apiKey')} />
          <Input label="Nome da instância" placeholder="default" {...register('instanceName')} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">{editItem ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal teste */}
      <Modal open={!!testId} onClose={() => setTestId(null)} title="Enviar Mensagem de Teste" size="sm">
        <form onSubmit={testForm.handleSubmit((d) => testMutation.mutate({ id: testId!, data: d }))} className="p-6 space-y-4">
          <Input label="Telefone (com DDI)" placeholder="5511999999999" {...testForm.register('phone')} />
          <Input label="Mensagem" placeholder="Mensagem de teste..." {...testForm.register('message')} />
          <Button type="submit" loading={testMutation.isPending} className="w-full">Enviar Teste</Button>
        </form>
      </Modal>
    </div>
  );
}
