'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  Users, Activity, Mail, UserPlus,
  Loader2, ArrowRight, Settings as SettingsIcon,
  BarChart3, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  emailsSent: number;
  newUsersToday: number;
  registrationTrend?: { date: string; count: number }[];
}

const quickLinks = [
  {
    href: '/admin/users',
    label: '用户管理',
    description: '查看和管理所有用户',
    icon: Users,
    gradient: 'from-primary/20 to-primary/5',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    href: '/admin/emails',
    label: '邮件设置',
    description: '管理邮件模板和日志',
    icon: Mail,
    gradient: 'from-accent/20 to-accent/5',
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
  },
  {
    href: '/admin/configs',
    label: '系统配置',
    description: '配置系统参数',
    icon: SettingsIcon,
    gradient: 'from-purple-100 to-purple-50',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
];

const statCards = [
  { key: 'totalUsers', label: '用户数', icon: Users, gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50' },
  { key: 'activeUsers', label: '活跃人数', icon: Activity, gradient: 'from-green-500 to-green-600', lightBg: 'bg-green-50' },
  { key: 'emailsSent', label: '邮件发送数', icon: Mail, gradient: 'from-purple-500 to-purple-600', lightBg: 'bg-purple-50' },
  { key: 'newUsersToday', label: '今日新增', icon: UserPlus, gradient: 'from-accent to-pink-600', lightBg: 'bg-pink-50' },
];

export default function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.getDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDashboard();
    }
  }, [isAdmin]);

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:shadow-lg transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">管理后台</h1>
          <p className="text-gray-500 mt-1">系统概览与运营数据</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all"
          title="刷新数据"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const value = stats ? stats[card.key as keyof DashboardStats] : 0;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 p-6 group hover:shadow-md transition-all"
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />

              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.lightBg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.gradient.replace('from-', 'text-').split(' ')[0]}`} />
                </div>
              </div>

              <p className="text-3xl font-bold mb-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Chart + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            注册趋势
          </h3>

          {stats?.registrationTrend && stats.registrationTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.registrationTrend}>
                  <defs>
                    <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#667eea"
                    strokeWidth={2}
                    fill="url(#regGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无注册数据</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-4"
        >
          <h3 className="text-base font-semibold text-gray-700">快捷入口</h3>
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-primary/20 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${link.iconBg} flex items-center justify-center`}>
                    <link.icon className={`w-6 h-6 ${link.iconColor}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{link.label}</p>
                    <p className="text-sm text-gray-400">{link.description}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
