'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authApi, userApi } from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User, Mail, Lock, Key, LogOut, Copy, Check,
  Eye, EyeOff, Loader2, Save, ArrowLeft
} from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Profile form
  const [nickname, setNickname] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Partner code
  const [copied, setCopied] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Sync nickname from user data
  useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      toast.error('昵称不能为空');
      return;
    }
    setProfileSaving(true);
    try {
      await userApi.updateProfile({ nickname: nickname.trim() });
      // Refresh user data in localStorage
      if (user) {
        const updated = { ...user, nickname: nickname.trim() };
        localStorage.setItem('user', JSON.stringify(updated));
      }
      toast.success('个人信息已更新');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '更新失败');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('请填写所有密码字段');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('新密码至少需要6个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setPasswordSaving(true);
    try {
      await authApi.changePassword({ oldPassword, newPassword });
      toast.success('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '密码修改失败');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCopyPartnerCode = async () => {
    if (!user?.partnerCode) return;
    try {
      await navigator.clipboard.writeText(user.partnerCode);
      setCopied(true);
      toast.success('已复制伴侣码');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Get initials for avatar
  const initials = (user.nickname || user.email || '?')[0].toUpperCase();

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            设置
          </h1>
          <p className="text-gray-500 mt-1">管理你的个人信息和账户安全</p>
        </motion.div>

        {/* ========== 个人信息 ========== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            个人信息
          </h2>

          <div className="flex items-center gap-6 mb-8">
            {/* Avatar - initials circle */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-md">
              {initials}
            </div>
            <div>
              <p className="text-lg font-medium">{user.nickname || '未设置昵称'}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
              <p className="text-xs text-gray-300 mt-1">
                角色：{user.role === 'ADMIN' ? '管理员' : '用户'}
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="输入你的昵称"
                maxLength={20}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-400">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">不可更改</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {profileSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {profileSaving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </motion.section>

        {/* ========== 修改密码 ========== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            修改密码
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {/* Old password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">当前密码</label>
              <div className="relative">
                <input
                  type={showOldPw ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="输入当前密码"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPw(!showOldPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少6个字符"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">确认新密码</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {passwordSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {passwordSaving ? '修改中...' : '修改密码'}
              </button>
            </div>
          </form>
        </motion.section>

        {/* ========== 伴侣信息 ========== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-accent" />
            </div>
            伴侣信息
          </h2>

          {user.partnerCode ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                分享你的伴侣码给对方，连接后即可共享记忆星球
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-5 py-3 bg-gradient-to-r from-primary/5 to-accent/5 border border-dashed border-primary/30 rounded-xl">
                  <span className="text-lg font-mono font-bold tracking-wider gradient-text">
                    {user.partnerCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyPartnerCode}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl hover:shadow-lg transition-all whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      复制码
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>尚未连接伴侣</p>
              <p className="text-sm mt-1">
                前往 <span className="text-primary font-medium">伴侣连接</span> 页面绑定你的另一半
              </p>
            </div>
          )}
        </motion.section>

        {/* ========== 账号操作 ========== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            账号操作
          </h2>

          <p className="text-sm text-gray-500 mb-4">退出登录后需要重新输入密码访问你的账户</p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 hover:shadow-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </motion.section>
      </div>
    </PageLayout>
  );
}
