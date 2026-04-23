'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { Automation, PipeIntegration, MessageTemplate, WhatsAppIntegration, TriggerType } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

const TRIGGERS: Record<TriggerType, string> = {
  CARD_CREATED: 'Card criado',
  CARD_MOVED_TO_PHASE: 'Card entrou na fase',
  CARD_LEFT_PHASE: 'Card saiu da fase',
  FIELD_CHANGED: 'Campo alterado',
  CARD_STALE: 'Card parado há X dias',
};

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  pipeIntegrationId: z.string().min(1, 'Pipe obrigatório'),
  triggerType: z.string().min(1, 'Trigger obrigatório'),
  phaseId: z.string().optional(),
  phaseName: z.string().optional(),
  templateId: z.string().min(1, 'Template obrigatório'),
  whatsappIntegrationId: z.string().optional(),
  delayMinutes: z.coerce.number().min(0).default(0),
  allowDuplicate: z.boolean().default(false),
  active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Automation | null>(null);
  const [error, setError] = useState('');

  const { data: automations = [], isLoading } = useQuery<Automation[]>({
    queryKey: ['automations'],
    queryFn: async () => (await api.get('/automations')).data.data,
  });

  const { data: pipes = [] } = useQuery<PipeIntegration[]>({
    queryKey: ['pipes'],
    queryFn: async () => (await api.get('/pipefy')).data.data,
  });

  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data.data,
  });

  const { data: waIntegrations = [] } = useQuery<WhatsAppIntegration[]>({
    queryKey: ['whatsapp'],
    queryFn: async () => (await api.get('/whatsapp')).data.data,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { ...data, triggerConfig: {} };
      if (editItem) return api.put(`/automations/${editItem.id}`, payload);
      return api.post('/automations', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automations'] }); setShowModal(false); reset(); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/automations/${id}/toggle`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  function openCreate() {
    setEditItem(null);
    reset({ delayMinutes: 0, allowDuplicate: false, active: true });
    setError('');
    setShowModal(true);
  }

  function openEdit(a: Automation) {
    setEditItem(a);
    reset({
      name: a.name, description: a.description ?? '',
      pipeIntegrationId: a.pipeIntegrationId, triggerType: a.triggerType,
      phaseId: a.phaseId ?? '', phaseName: a.phaseName ?? '',
      templateId: a.templateId, whatsappIntegrationId: a.whatsappIntegrationId ?? '',
      delayMinutes: a.delayMinutes, allowDuplicate: a.allowDuplicate, active: a.active,
    });
    setError('');
    setShowModal(true);
  }

  return (
    <div>
      <Header
        title="Automações"
        subtitle="Configure disparos automáticos baseados em eventos do Pipefy"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Nova Automação</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-2">Nenhuma automação criada</p>
          <p className="text-gray-400 text-sm mb-6">Crie automações para disparar mensagens automaticamente</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4" />Nova Automação</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.id} className={clsx('bg-white rounded-xl border shadow-sm p-5', a.active ? 'border-gray-200' : 'border-gray-100 opacity-60')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{a.name}</h3>
                    {a.active
                      ? <Badge variant="success">Ativa</Badge>
                      : <Badge variant="gray">Inativa</Badge>
                    }
                  </div>
                  {a.description && <p className="text-sm text-gray-500 mb-2">{a.description}</p>}
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      {a.pipeIntegration?.pipeName ?? 'Pipe'}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                      {TRIGGERS[a.triggerType]}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                      {a.template?.name}
                    </span>
                    {a.delayMinutes > 0 && (
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded">
                        Delay: {a.delayMinutes}min
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      {a._count?.messageLogs ?? 0} disparos
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: a.id, active: !a.active })}
                    className={clsx('p-2 rounded-lg transition-colors', a.active ? 'hover:bg-red-50 text-green-600 hover:text-red-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-600')}
                    title={a.active ? 'Desativar' : 'Ativar'}
                  >
                    {a.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(a)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.confirm('Remover automação?') && deleteMutation.mutate(a.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Editar Automação' : 'Nova Automação'} size="lg">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <Input label="Nome da automação" error={errors.name?.message} {...register('name')} />
          <Input label="Descrição (opcional)" {...register('description')} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Pipe"
              error={errors.pipeIntegrationId?.message}
              options={pipes.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Selecione o pipe"
              {...register('pipeIntegrationId')}
            />
            <Select
              label="Trigger"
              error={errors.triggerType?.message}
              options={Object.entries(TRIGGERS).map(([v, l]) => ({ value: v, label: l }))}
              placeholder="Selecione o evento"
              {...register('triggerType')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="ID da fase (opcional)" placeholder="ID da fase no Pipefy" {...register('phaseId')} />
            <Input label="Nome da fase (opcional)" placeholder="Nome para exibição" {...register('phaseName')} />
          </div>

          <Select
            label="Template de mensagem"
            error={errors.templateId?.message}
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Selecione o template"
            {...register('templateId')}
          />

          <Select
            label="Integração WhatsApp (opcional)"
            options={waIntegrations.map((w) => ({ value: w.id, label: w.name }))}
            placeholder="Padrão do sistema"
            {...register('whatsappIntegrationId')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Delay (minutos)" type="number" min={0} {...register('delayMinutes')} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Opções</label>
              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded" {...register('allowDuplicate')} />
                  Permitir duplicados
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded" {...register('active')} />
                  Ativar imediatamente
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>
              {editItem ? 'Salvar' : 'Criar Automação'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
