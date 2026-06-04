'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mail, FileText, Loader2, RefreshCw, X,
  Edit3, Save, ChevronLeft, ChevronRight
} from 'lucide-react';

// Types
interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  updatedAt: string;
}

export default function AdminEmailsPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'logs' | 'templates'>('logs');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          邮件管理
        </h1>
        <p className="text-gray-500 mt-1">查看邮件发送记录和管理邮件模板</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'logs'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          邮件日志
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'templates'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          邮件模板
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'logs' ? <EmailLogs /> : <EmailTemplates />}
    </div>
  );
}

/* ========== Email Logs Tab ========== */
function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await adminApi.getEmailLogs({ page: p, limit });
      setLogs(data.logs || data.data || data || []);
      setTotalPages(data.totalPages || data.meta?.totalPages || 1);
      setTotal(data.total || data.meta?.total || 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '获取邮件日志失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'sent' || s === 'success') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
          已发送
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
          等待中
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
        失败
      </span>
    );
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-medium text-gray-700">发送记录</h3>
        <button
          onClick={() => fetchLogs(page)}
          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无邮件记录</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">收件人</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">主题</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">发送时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-700">{log.to}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{log.subject}</td>
                  <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {formatDateTime(log.sentAt)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">共 {total} 条记录</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 px-3">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Email Templates Tab ========== */
function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subject: '', content: '' });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getTemplates();
      setTemplates(data.templates || data.data || data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '获取模板失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const startEditing = (template: EmailTemplate) => {
    setEditingId(template.id);
    setEditForm({ subject: template.subject, content: template.content });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ subject: '', content: '' });
  };

  const handleSave = async () => {
    if (!editingId) return;
    if (!editForm.subject.trim() || !editForm.content.trim()) {
      toast.error('主题和内容不能为空');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateTemplate(editingId, editForm);
      toast.success('模板已更新');
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, subject: editForm.subject, content: editForm.content, updatedAt: new Date().toISOString() }
            : t
        )
      );
      setEditingId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-700">邮件模板列表</h3>
        <button
          onClick={fetchTemplates}
          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无模板</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {editingId === template.id ? (
                /* Inline edit mode */
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-700">{template.name}</h4>
                    <button
                      onClick={cancelEditing}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">邮件主题</label>
                    <input
                      type="text"
                      value={editForm.subject}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">邮件内容</label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y font-mono text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:shadow-md transition-all text-sm disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saving ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-800">{template.name}</h4>
                      <p className="text-sm text-gray-500 mt-0.5">{template.subject}</p>
                    </div>
                    <button
                      onClick={() => startEditing(template)}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                      title="编辑"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 max-h-32 overflow-y-auto">
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
                      {template.content.length > 300
                        ? template.content.slice(0, 300) + '...'
                        : template.content}
                    </pre>
                  </div>

                  <p className="text-xs text-gray-400 mt-3">
                    最后更新：{formatDate(template.updatedAt)}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
