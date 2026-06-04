'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return '密码至少8个字符';
    if (!/[A-Z]/.test(pwd)) return '密码需要包含至少一个大写字母';
    if (!/[a-z]/.test(pwd)) return '密码需要包含至少一个小写字母';
    if (!/[0-9]/.test(pwd)) return '密码需要包含至少一个数字';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('请填写邮箱'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('请输入有效的邮箱地址'); return; }
    if (!password) { toast.error('请填写密码'); return; }
    const pwdError = validatePassword(password);
    if (pwdError) { toast.error(pwdError); return; }
    setLoading(true);
    try {
      await authApi.register({ email, password, nickname: nickname || undefined });
      toast.success('注册成功！请登录');
      router.push('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">创建账号</h1>
            <p className="text-gray-600 mt-1">开启你的记忆星球之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">昵称（选填）</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  placeholder="你的昵称" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-800 placeholder-gray-400"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少8位，含大小写字母和数字"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">至少8位，包含大写字母、小写字母和数字</p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50">
              {loading ? '注册中...' : '立即注册'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              已有账号？{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium">登录</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
