'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Star, PenLine, Users, Settings, LogOut, Heart,
  LayoutDashboard, Menu, X, ChevronRight, Sparkles, PawPrint, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/dashboard', label: '星点记忆', icon: Star },
  { href: '/memory/v4', label: '记忆册', icon: BookOpen },
  { href: '/letters', label: '情书', icon: PenLine },
  { href: '/pet/v3', label: '共同精灵', icon: PawPrint },
  { href: '/partner', label: '伴侣连接', icon: Users },
  { href: '/settings', label: '设置', icon: Settings },
];

const adminItems = [
  { href: '/admin', label: '管理后台', icon: LayoutDashboard },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

  if (isAuthPage || pathname === '/') return null;

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-serif font-bold gradient-text text-lg"
            >
              Remember Me
            </motion.span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {allItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={`p-4 border-t border-gray-100 ${collapsed ? 'text-center' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-medium shrink-0">
            {user?.nickname?.[0] || user?.email?.[0] || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.nickname || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`mt-3 flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors text-sm w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>退出登录</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-xl shadow-md border border-gray-100"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 shadow-xl lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
