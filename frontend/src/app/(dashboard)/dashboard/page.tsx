'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardStats } from '@/types';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CheckCircle, XCircle, Clock, Zap, TrendingUp, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/history/dashboard');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data ?? {
    totalSent: 0, totalError: 0, totalPending: 0, todaySent: 0,
    todayError: 0, activeAutomations: 0, successRate: 0, last7Days: [],
  };

  const chartData = stats.last7Days.map((d) => ({
    ...d,
    data: format(new Date(d.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
  }));

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Visão geral dos disparos e automações"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Enviado"
          value={stats.totalSent.toLocaleString('pt-BR')}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          subtitle={`Hoje: ${stats.todaySent}`}
        />
        <StatCard
          title="Com Erro"
          value={stats.totalError.toLocaleString('pt-BR')}
          icon={<XCircle className="w-6 h-6" />}
          color="red"
          subtitle={`Hoje: ${stats.todayError}`}
        />
        <StatCard
          title="Pendentes"
          value={stats.totalPending.toLocaleString('pt-BR')}
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
        />
        <StatCard
          title="Automações Ativas"
          value={stats.activeAutomations}
          icon={<Zap className="w-6 h-6" />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Gráfico de 7 dias */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Envios — últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2}>
              <XAxis dataKey="data" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" name="Enviados" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="error" name="Erros" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taxa de sucesso */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col items-center justify-center">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Taxa de Sucesso</h3>
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="#22c55e" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 40 * stats.successRate / 100} ${2 * Math.PI * 40}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
                <p className="text-xs text-gray-500">sucesso</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-6 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">{stats.totalSent} enviados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">{stats.totalError} erros</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
