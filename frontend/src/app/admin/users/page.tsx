'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, Users, Loader2, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Shield, ShieldOff,
  Trash2, X, AlertTriangle, RefreshCw
} from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  nickname: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1, limit: 10, total: 0, totalPages: 0,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDelete, setConfirmDelete] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await adminApi.getUsers({
        page,
        limit: pagination.limit,
        search: search || undefined,
      });
      setUsers(data.users || data.data || []);
      setPagination(data.pagination || data.meta || {
        page, limit: 10, total: 0, totalPages: 0,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [search, pagination.limit]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers(pagination.page);
    }
  }, [isAdmin, pagination.page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers(1);
  };

  const handleToggleStatus = async (user: UserItem) => {
    setActionLoading(user.id);
    try {
      await adminApi.updateUserStatus(user.id, !user.isActive);
      toast.success(`用户已${user.isActive ? '停用' : '启用'}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (user: UserItem) => {
    setActionLoading(user.id);
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await adminApi.updateUserRole(user.id, newRole);
      toast.success(`用户已${newRole === 'ADMIN' ? '提升为管理员' : '降级为普通用户'}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(confirmDelete.id);
      toast.success('用户已删除');
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      setConfirmDelete(null);
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
          <Shield className="w-3 h-3" />
          管理员
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        用户
      </span>
    );
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            用户管理
          </h1>
          <p className="text-gray-500 mt-1">共 {pagination.total} 位用户</p>
        </div>
        <button
          onClick={() => fetchUsers(pagination.page)}
          className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索邮箱或昵称..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-primary text-white rounded-xl hover:shadow-md transition-all text-sm"
        >
          搜索
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无用户数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">昵称</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {user.nickname || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {user.isActive ? '正常' : '已停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle status */}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={actionLoading === user.id}
                          className={`p-2 rounded-lg transition-all ${
                            user.isActive
                              ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          } disabled:opacity-50`}
                          title={user.isActive ? '停用' : '启用'}
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : user.isActive ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>

                        {/* Toggle role */}
                        <button
                          onClick={() => handleToggleRole(user)}
                          disabled={actionLoading === user.id}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                          title={user.role === 'ADMIN' ? '降级为用户' : '提升为管理员'}
                        >
                          {user.role === 'ADMIN' ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setConfirmDelete(user)}
                          disabled={actionLoading === user.id}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  const page = pagination.page;
                  return p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1;
                })
                .map((p, i, arr) => (
                  <span key={p} className="flex items-center">
                    {i > 0 && arr[i - 1] !== p - 1 && (
                      <span className="px-1 text-gray-300">...</span>
                    )}
                    <button
                      onClick={() => setPagination((prev) => ({ ...prev, page: p }))}
                      className={`w-8 h-8 rounded-lg text-sm transition-all ${
                        pagination.page === p
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold">确认删除用户</h3>
                <p className="text-sm text-gray-500 mt-2">
                  此操作不可撤销，确定要删除用户
                  <br />
                  <span className="font-medium text-gray-700">{confirmDelete.email}</span>
                  {' '}吗？
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
