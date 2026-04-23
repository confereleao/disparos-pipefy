'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, Search, CheckSquare, Square } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { PipeIntegration, MessageTemplate, WhatsAppIntegration, CardCache } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

export default function DispatchPage() {
  const [selectedPipeId, setSelectedPipeId] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState('');
  const [waIntegrationId, setWaIntegrationId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ queued: number } | null>(null);
  const [dispatchError, setDispatchError] = useState('');

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

  const { data: cards = [], isLoading: cardsLoading } = useQuery<CardCache[]>({
    queryKey: ['cards', selectedPipeId, selectedPhaseId, search],
    queryFn: async () => {
      if (!selectedPipeId) return [];
      const params = new URLSearchParams();
      if (selectedPhaseId) params.set('phaseId', selectedPhaseId);
      if (search) params.set('search', search);
      return (await api.get(`/pipefy/${selectedPipeId}/cards?${params}`)).data.data;
    },
    enabled: !!selectedPipeId,
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const items = Array.from(selectedCards).map((cardId) => {
        const card = cards.find((c) => c.cardId === cardId);
        return {
          cardId,
          cardTitle: card?.cardTitle ?? undefined,
          pipeIntegrationId: selectedPipeId,
          templateId,
          whatsappIntegrationId: waIntegrationId || undefined,
        };
      });
      return (await api.post('/queue/dispatch', { items })).data.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setSelectedCards(new Set());
      setConfirmOpen(false);
    },
    onError: (err) => setDispatchError(getErrorMessage(err)),
  });

  function toggleCard(cardId: string) {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function toggleAll() {
    if (selectedCards.size === cards.length) setSelectedCards(new Set());
    else setSelectedCards(new Set(cards.map((c) => c.cardId)));
  }

  const selectedPipe = pipes.find((p) => p.id === selectedPipeId);
  const fieldMapping = (selectedPipe?.fieldMapping ?? {}) as Record<string, string>;

  return (
    <div>
      <Header
        title="Disparos Manuais"
        subtitle="Selecione cards e envie mensagens em massa"
      />

      {result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700 font-medium">
            ✅ {result.queued} mensagem(ns) adicionada(s) à fila com sucesso!
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Pipe"
            options={pipes.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Selecione o pipe"
            value={selectedPipeId}
            onChange={(e) => { setSelectedPipeId(e.target.value); setSelectedCards(new Set()); }}
          />
          <Input
            label="Buscar por título"
            placeholder="Nome do card..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-end">
            <Button variant="secondary" className="w-full" onClick={() => { setSearch(''); setSelectedPhaseId(''); }}>
              Limpar filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Configuração do envio */}
      {selectedPipeId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Configuração do Envio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Template de mensagem"
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Selecione o template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            />
            <Select
              label="Integração WhatsApp"
              options={waIntegrations.map((w) => ({ value: w.id, label: w.name }))}
              placeholder="Padrão do sistema"
              value={waIntegrationId}
              onChange={(e) => setWaIntegrationId(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Lista de cards */}
      {selectedPipeId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="text-gray-500 hover:text-gray-700">
                {selectedCards.size === cards.length && cards.length > 0
                  ? <CheckSquare className="w-5 h-5 text-green-600" />
                  : <Square className="w-5 h-5" />
                }
              </button>
              <span className="text-sm text-gray-600">
                {cardsLoading ? 'Carregando...' : `${cards.length} cards`}
                {selectedCards.size > 0 && ` • ${selectedCards.size} selecionados`}
              </span>
            </div>
            {selectedCards.size > 0 && templateId && (
              <Button onClick={() => setConfirmOpen(true)}>
                <Send className="w-4 h-4" />
                Enviar ({selectedCards.size})
              </Button>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {cards.map((card) => {
              const phone = fieldMapping['telefone'] ? card.fields[fieldMapping['telefone']] : null;
              const name = fieldMapping['nome'] ? card.fields[fieldMapping['nome']] : null;
              const isSelected = selectedCards.has(card.cardId);

              return (
                <div
                  key={card.cardId}
                  onClick={() => toggleCard(card.cardId)}
                  className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="text-gray-400">
                    {isSelected
                      ? <CheckSquare className="w-5 h-5 text-green-600" />
                      : <Square className="w-5 h-5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{card.cardTitle ?? card.cardId}</p>
                    <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                      {name && <span>{name}</span>}
                      {phone && <span>{phone}</span>}
                      {card.phaseName && <span className="px-1.5 py-0.5 bg-gray-100 rounded">{card.phaseName}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {!cardsLoading && cards.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Nenhum card encontrado
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmar Disparo" size="sm">
        <div className="p-6">
          {dispatchError && <p className="text-sm text-red-600 mb-4">{dispatchError}</p>}
          <p className="text-gray-600 mb-6">
            Você está prestes a enviar mensagens para <strong>{selectedCards.size} card(s)</strong>.
            <br />Deseja continuar?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={() => dispatchMutation.mutate()} loading={dispatchMutation.isPending}>
              Confirmar Envio
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
