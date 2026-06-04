'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email) { toast.error('请填写邮箱'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.sendCode(email, 'RESET_PASSWORD');
      setStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
      }, 1000);
      if (data.code) {
        setCode(data.code);
        toast.success('验证码已自动填入（开发模式）');
      } else {
        toast.success('验证码已发送');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '发送失败');
    } finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) { toast.error('请输入6位验证码'); return; }
    setStep('password');
  };

  const handleReset = async () => {
    if (newPassword.length < 8) { toast.error('密码至少8个字符'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, code, newPassword });
      setStep('done');
      toast.success('密码重置成功');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '重置失败');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回登录
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">找回密码</h1>
            <p className="text-gray-600 mt-1">
              {step === 'email' && '输入邮箱接收验证码'}
              {step === 'code' && '请输入邮箱中收到的验证码'}
              {step === 'password' && '设置新密码'}
              {step === 'done' && '密码已重置'}
            </p>
          </div>

          {step === 'email' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>
              <button onClick={handleSendCode} disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50">
                {loading ? '发送中...' : '发送验证码'}
              </button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-5">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">验证码已发送至 <span className="font-medium">{email}</span></p>
              </div>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6}
                className="w-full text-center text-2xl tracking-[12px] py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
              <button onClick={handleVerifyCode} disabled={code.length !== 6}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50">
                验证
              </button>
              <div className="text-center">
                <button onClick={handleSendCode} disabled={countdown > 0}
                  className="text-sm text-primary disabled:text-gray-400">
                  {countdown > 0 ? `${countdown}秒后重新发送` : '重新发送'}
                </button>
              </div>
            </div>
          )}

          {step === 'password' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少8位，含大小写字母和数字"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button onClick={handleReset} disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50">
                {loading ? '重置中...' : '重置密码'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-5">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-gray-600">密码已成功重置</p>
              <button onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all">
                返回登录
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
