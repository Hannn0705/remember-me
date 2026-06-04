'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Settings, Loader2, RefreshCw, Edit3,
  Save, X, ChevronDown, ChevronRight, Server
} from 'lucide-react';

interface ConfigItem {
  key: string;
  value: any;
  description?: string;
  updatedAt?: string;
}

export default function AdminConfigsPage() {
  const { isAdmin } = useAuth();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getConfigs();
      const items = data.configs || data.data || data || [];
      setConfigs(Array.isArray(items) ? items : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '获取配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchConfigs();
    }
  }, [isAdmin, fetchConfigs]);

  const startEditing = (config: ConfigItem) => {
    setEditingKey(config.key);
    setEditValue(
      typeof config.value === 'object'
        ? JSON.stringify(config.value, null, 2)
        : String(config.value)
    );
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setSaving(true);
    try {
      // Try to parse as JSON if it looks like an object/array
      let parsedValue: any = editValue;
      if (editValue.trim().startsWith('{') || editValue.trim().startsWith('[')) {
        try {
          parsedValue = JSON.parse(editValue);
        } catch {
          // Not valid JSON, keep as string
        }
      } else if (editValue === 'true') {
        parsedValue = true;
      } else if (editValue === 'false') {
        parsedValue = false;
      } else if (!isNaN(Number(editValue)) && editValue.trim() !== '') {
        parsedValue = Number(editValue);
      }

      await adminApi.updateConfig(editingKey, parsedValue);
      toast.success('配置已更新');
      setConfigs((prev) =>
        prev.map((c) =>
          c.key === editingKey
            ? { ...c, value: parsedValue, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setEditingKey(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '<null>';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const isLongValue = (value: any): boolean => {
    const str = formatValue(value);
    return str.length > 60;
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            系统配置
          </h1>
          <p className="text-gray-500 mt-1">管理系统运行参数</p>
        </div>
        <button
          onClick={fetchConfigs}
          className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Config List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无配置项</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {configs.map((config, index) => (
              <motion.div
                key={config.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="hover:bg-gray-50/50 transition-colors"
              >
                {editingKey === config.key ? (
                  /* Inline edit mode */
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" />
                        <code className="text-sm font-mono font-medium text-gray-800">{config.key}</code>
                      </div>
                      <button
                        onClick={cancelEditing}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {config.description && (
                      <p className="text-sm text-gray-500">{config.description}</p>
                    )}

                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-sm"
                    />

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
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Server className="w-4 h-4 text-gray-400 shrink-0" />
                          <code className="text-sm font-mono font-medium text-gray-800">{config.key}</code>
                        </div>

                        {config.description && (
                          <p className="text-xs text-gray-400 mb-2">{config.description}</p>
                        )}

                        <div
                          className={`bg-gray-50 rounded-lg ${
                            isLongValue(config.value) ? 'cursor-pointer' : ''
                          }`}
                          onClick={() => {
                            if (isLongValue(config.value)) {
                              toggleExpand(config.key);
                            }
                          }}
                        >
                          <div className="px-3 py-2">
                            {typeof config.value === 'object' ? (
                              <div>
                                <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                                  {isLongValue(config.value) && (
                                    <button onClick={() => toggleExpand(config.key)}>
                                      {expandedKeys.has(config.key) ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                  <span>{typeof config.value === 'object' ? 'JSON' : ''}</span>
                                </div>
                                <pre className={`text-sm text-gray-600 font-mono ${
                                  expandedKeys.has(config.key) || !isLongValue(config.value)
                                    ? ''
                                    : 'line-clamp-2'
                                }`}>
                                  {JSON.stringify(config.value, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <code className="text-sm text-gray-700 font-mono break-all">
                                {formatValue(config.value)}
                              </code>
                            )}
                          </div>
                        </div>

                        {config.updatedAt && (
                          <p className="text-xs text-gray-300 mt-1.5">
                            更新于 {new Date(config.updatedAt).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => startEditing(config)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all shrink-0"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
