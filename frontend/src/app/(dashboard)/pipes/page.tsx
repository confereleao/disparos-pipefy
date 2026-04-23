'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, RefreshCw, Edit2, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { PipeIntegration } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  pipefyToken: z.string().min(1, 'Token obrigatório'),
  pipeId: z.string().min(1, 'ID do pipe obrigatório'),
});

type FormData = z.infer<typeof schema>;

export default function PipesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PipeIntegration | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: pipes = [], isLoading } = useQuery<PipeIntegration[]>({
    queryKey: ['pipes'],
    queryFn: async () => (await api.get('/pipefy')).data.data,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editItem) return api.put(`/pipefy/${editItem.id}`, data);
      return api.post('/pipefy', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipes'] });
      setShowModal(false);
      reset();
      setEditItem(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pipefy/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipes'] }),
  });

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      const res = await api.post(`/pipefy/${id}/sync`);
      alert(`Sincronizado: ${res.data.data.synced} cards`);
      qc.invalidateQueries({ queryKey: ['pipes'] });
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSyncingId(null);
    }
  }

  function openCreate() {
    setEditItem(null);
    reset();
    setError('');
    setShowModal(true);
  }

  function openEdit(p: PipeIntegration) {
    setEditItem(p);
    reset({ name: p.name, pipeId: p.pipeId, pipefyToken: '' });
    setError('');
    setShowModal(true);
  }

  return (
    <div>
      <Header
        title="Pipes Integrados"
        subtitle="Conecte e gerencie seus pipes do Pipefy"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Adicionar Pipe</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : pipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-2">Nenhum pipe conectado</p>
          <p className="text-gray-400 text-sm mb-6">Adicione seu primeiro pipe do Pipefy para começar</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4" />Adicionar Pipe</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {pipes.map((pipe) => (
            <div key={pipe.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{pipe.name}</h3>
                    {pipe.active
                      ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3.5 h-3.5" />Ativo</span>
                      : <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" />Inativo</span>
                    }
                  </div>
                  <p className="text-sm text-gray-500">
                    Pipe: <span className="font-mono">{pipe.pipeName ?? pipe.pipeId}</span>
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>{pipe._count?.automations ?? 0} automações</span>
                    <span>{pipe._count?.cardsCache ?? 0} cards em cache</span>
                    {pipe.lastSyncAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Sync: {format(new Date(pipe.lastSyncAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSync(pipe.id)}
                    loading={syncingId === pipe.id}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sincronizar
                  </Button>
                  <button onClick={() => openEdit(pipe)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.confirm('Remover pipe? Isso vai excluir automações vinculadas.') && deleteMutation.mutate(pipe.id)}
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Editar Integração' : 'Nova Integração Pipefy'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <Input label="Nome da integração" placeholder="Ex: Comercial, Cobrança..." error={errors.name?.message} {...register('name')} />
          <Input
            label="Token do Pipefy"
            type="password"
            placeholder={editItem ? '(deixe vazio para manter o atual)' : 'Token de acesso pessoal'}
            error={errors.pipefyToken?.message}
            hint="Acesse Pipefy → Configurações → Tokens de Acesso Pessoal"
            {...register('pipefyToken', { required: !editItem })}
          />
          <Input
            label="ID do Pipe"
            placeholder="Ex: 12345678"
            error={errors.pipeId?.message}
            hint="Encontrado na URL do pipe no Pipefy"
            {...register('pipeId')}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>
              {editItem ? 'Salvar' : 'Conectar Pipe'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
