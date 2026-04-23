'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, ShieldCheck, User as UserIcon, Eye } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { User, Role } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ROLES: Record<Role, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  VIEWER: 'Visualizador',
};

const ROLE_BADGE: Record<Role, 'success' | 'info' | 'gray'> = {
  ADMIN: 'success',
  OPERATOR: 'info',
  VIEWER: 'gray',
};

const createSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']).default('OPERATOR'),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']).optional(),
  active: z.boolean().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

export default function UsersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [error, setError] = useState('');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data.data,
  });

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const updateForm = useForm<UpdateForm>({ resolver: zodResolver(updateSchema) });

  const saveMutation = useMutation({
    mutationFn: async (data: CreateForm | UpdateForm) => {
      const payload = { ...data };
      if (editItem) {
        if ('password' in payload && !payload.password) delete (payload as any).password;
        return api.put(`/users/${editItem.id}`, payload);
      }
      return api.post('/users', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      createForm.reset();
      updateForm.reset();
      setEditItem(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  function openCreate() {
    setEditItem(null);
    createForm.reset();
    setError('');
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditItem(u);
    updateForm.reset({ name: u.name, email: u.email, role: u.role, active: u.active });
    setError('');
    setShowModal(true);
  }

  return (
    <div>
      <Header
        title="Usuários"
        subtitle="Gerencie os usuários e permissões do sistema"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Novo Usuário</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Usuário</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Perfil</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Último login</th>
                <th className="w-24 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={ROLE_BADGE[u.role]}>{ROLES[u.role]}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    {u.active
                      ? <Badge variant="success">Ativo</Badge>
                      : <Badge variant="gray">Inativo</Badge>
                    }
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs">
                    {u.lastLoginAt
                      ? format(new Date(u.lastLoginAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })
                      : '—'
                    }
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => window.confirm('Remover usuário?') && deleteMutation.mutate(u.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Editar Usuário' : 'Novo Usuário'}>
        {editItem ? (
          <form onSubmit={updateForm.handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <Input label="Nome" error={updateForm.formState.errors.name?.message} {...updateForm.register('name')} />
            <Input label="Email" type="email" error={updateForm.formState.errors.email?.message} {...updateForm.register('email')} />
            <Input label="Nova senha (opcional)" type="password" placeholder="Deixe vazio para manter" {...updateForm.register('password')} />
            <Select
              label="Perfil"
              options={Object.entries(ROLES).map(([v, l]) => ({ value: v, label: l }))}
              {...updateForm.register('role')}
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" {...updateForm.register('active')} />
              Usuário ativo
            </label>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" loading={saveMutation.isPending} className="flex-1">Salvar</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit((d) => saveMutation.mutate(d))} className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <Input label="Nome" error={createForm.formState.errors.name?.message} {...createForm.register('name')} />
            <Input label="Email" type="email" error={createForm.formState.errors.email?.message} {...createForm.register('email')} />
            <Input label="Senha" type="password" error={createForm.formState.errors.password?.message} {...createForm.register('password')} />
            <Select
              label="Perfil"
              options={Object.entries(ROLES).map(([v, l]) => ({ value: v, label: l }))}
              {...createForm.register('role')}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" loading={saveMutation.isPending} className="flex-1">Criar Usuário</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
