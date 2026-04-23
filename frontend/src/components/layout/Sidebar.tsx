'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Plug, Zap, MessageSquare, Send, History,
  ScrollText, Users, Settings, LogOut, MessageCircle, Smartphone,
} from 'lucide-react';
import { getUser, clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipes', label: 'Pipes', icon: Plug },
  { href: '/automations', label: 'Automações', icon: Zap },
  { href: '/templates', label: 'Templates', icon: MessageSquare },
  { href: '/whatsapp', label: 'WhatsApp', icon: Smartphone, adminOnly: true },
  { href: '/dispatch', label: 'Disparar Manual', icon: Send },
  { href: '/history', label: 'Histórico', icon: History },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/users', label: 'Usuários', icon: Users, adminOnly: true },
  { href: '/settings', label: 'Configurações', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN',
  );

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">Disparos</p>
          <p className="text-xs text-gray-400 leading-none mt-0.5">Pipefy + WhatsApp</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-semibold text-white">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
