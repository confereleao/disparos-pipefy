'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Eye, Tag } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { MessageTemplate, TemplateCategory } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

const CATEGORIES: Record<TemplateCategory, string> = {
  COMMERCIAL: 'Comercial',
  BILLING: 'Cobrança',
  SUPPORT: 'Suporte',
  FOLLOW_UP: 'Follow-up',
  REMINDER: 'Lembrete',
};

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.string().min(1, 'Categoria obrigatória'),
  content: z.string().min(1, 'Conteúdo obrigatório'),
});

type FormData = z.infer<typeof schema>;

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MessageTemplate | null>(null);
  const [previewModal, setPreviewModal] = useState<MessageTemplate | null>(null);
  const [error, setError] = useState('');

  const { data: templates = [], isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data.data,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const contentValue = watch('content', '');

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editItem) return api.put(`/templates/${editItem.id}`, data);
      return api.post('/templates', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setShowModal(false);
      reset();
      setEditItem(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  function openCreate() {
    setEditItem(null);
    reset({ name: '', category: '', content: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(t: MessageTemplate) {
    setEditItem(t);
    reset({ name: t.name, category: t.category, content: t.content });
    setError('');
    setShowModal(true);
  }

  const variables = Array.from(
    new Set((contentValue?.match(/\{\{(\w+)\}\}/g) ?? []).map((v) => v.slice(2, -2))),
  );

  return (
    <div>
      <Header
        title="Templates de Mensagem"
        subtitle="Crie e gerencie os modelos de mensagem com variáveis dinâmicas"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Novo Template</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                  <Badge variant="info" className="mt-1">{CATEGORIES[t.category]}</Badge>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setPreviewModal(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => window.confirm('Remover template?') && deleteMutation.mutate(t.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line">{t.content}</p>

              {t.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
                  {t.variables.map((v) => (
                    <span key={v} className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                      <Tag className="w-2.5 h-2.5" />
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Editar Template' : 'Novo Template'} size="lg">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <Input label="Nome do template" error={errors.name?.message} {...register('name')} />

          <Select
            label="Categoria"
            error={errors.category?.message}
            options={Object.entries(CATEGORIES).map(([v, l]) => ({ value: v, label: l }))}
            placeholder="Selecione a categoria"
            {...register('category')}
          />

          <Textarea
            label="Conteúdo da mensagem"
            rows={8}
            error={errors.content?.message}
            hint="Use {{variavel}} para inserir dados dinâmicos. Ex: {{nome}}, {{telefone}}, {{empresa}}, {{fase}}, {{responsavel}}"
            {...register('content')}
          />

          {variables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Variáveis detectadas:</p>
              <div className="flex flex-wrap gap-1">
                {variables.map((v) => (
                  <span key={v} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>
              {editItem ? 'Salvar alterações' : 'Criar template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de preview */}
      <Modal open={!!previewModal} onClose={() => setPreviewModal(null)} title={`Preview: ${previewModal?.name}`}>
        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-700 whitespace-pre-line">{previewModal?.content}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-1">
            {previewModal?.variables.map((v) => (
              <span key={v} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
