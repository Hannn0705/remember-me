'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { partnerApi } from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Heart, Users, Link2, Unlink, Copy, CheckCircle,
  X, Loader2, UserPlus, MessageCircle, Clock,
  UserCheck, UserX, Sparkles, Share2, Send,
  ChevronRight, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface PartnerInfo {
  id: string;
  nickname: string | null;
  email: string;
  avatarUrl: string | null;
  partnerSince?: string;
}

interface PartnerRequest {
  id: string;
  sender: { id: string; nickname: string | null; avatarUrl: string | null; email: string };
  status: string;
  message: string | null;
  createdAt: string;
}

const HEART_POSITIONS = [
  { id: 1, top: '10%', left: '5%', delay: 0, size: 20 },
  { id: 2, top: '30%', left: '90%', delay: 1.5, size: 14 },
  { id: 3, top: '60%', left: '8%', delay: 0.8, size: 18 },
  { id: 4, top: '80%', left: '85%', delay: 2.2, size: 12 },
  { id: 5, top: '50%', left: '50%', delay: 0.3, size: 24 },
];

export default function PartnerPage() {
  const { user, loading: authLoading, hasPartner } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<'overview' | 'invite' | 'connect'>('overview');
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Connect form
  const [partnerCode, setPartnerCode] = useState('');
  const [message, setMessage] = useState('');

  // Copy state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (hasPartner) {
        const { data } = await partnerApi.getInfo();
        setPartnerInfo(data.partner || data);
      }
    } catch (err: any) {
      console.error('Failed to fetch partner info:', err);
    } finally {
      setLoading(false);
    }
  }, [hasPartner]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const { data } = await partnerApi.getRequests();
      const list = Array.isArray(data) ? data : data.requests || data.incoming || [];
      setRequests(list);
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  // Fetch requests on mount
  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const handleSendRequest = async () => {
    if (!partnerCode.trim()) {
      toast.error('请输入伴侣码');
      return;
    }
    setActionLoading(true);
    try {
      await partnerApi.sendRequest({
        toCode: partnerCode.trim(),
        message: message.trim() || undefined,
      });
      toast.success('连接请求已发送 💕');
      setPartnerCode('');
      setMessage('');
      setActiveSection('overview');
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '发送请求失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(true);
    try {
      await partnerApi.acceptRequest(requestId);
      toast.success('已接受伴侣请求，你们现在是伴侣了！💕');
      fetchRequests();
      fetchData();
      // Reload user data to update hasPartner status
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.partnerId = 'connected';
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      // Force reload to re-evaluate hasPartner
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '接受失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setActionLoading(true);
    try {
      await partnerApi.rejectRequest(requestId);
      toast.success('已拒绝请求');
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '拒绝失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('确定要解除伴侣连接吗？解除后需要重新发送连接请求。')) {
      return;
    }
    setActionLoading(true);
    try {
      await partnerApi.disconnect();
      toast.success('已解除伴侣连接');
      setPartnerInfo(null);
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.partnerId = null;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '解除连接失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (user?.partnerCode) {
      try {
        await navigator.clipboard.writeText(user.partnerCode);
        setCopied(true);
        toast.success('伴侣码已复制到剪贴板 📋');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('复制失败，请手动复制');
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageLayout>
      {/* Floating hearts background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {HEART_POSITIONS.map((heart) => (
          <motion.div
            key={heart.id}
            className="absolute text-primary/8"
            style={{ top: heart.top, left: heart.left }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.25, 0.1],
              rotate: [0, 15, -15, 0],
            }}
            transition={{
              duration: 4 + heart.id,
              repeat: Infinity,
              delay: heart.delay,
              ease: 'easeInOut',
            }}
          >
            <Heart size={heart.size} fill="currentColor" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-secondary animate-heartbeat" fill="currentColor" />
            伴侣连接
          </h1>
          <p className="text-gray-500 mt-1">
            与你的另一半建立专属连接
          </p>
        </motion.div>

        {/* Pending Requests Banner */}
        {!hasPartner && requests.filter((r) => r.status === 'PENDING').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-pink-50 to-primary/5 border border-pink-200 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Heart className="w-5 h-5 text-white animate-heartbeat" fill="currentColor" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  收到 {requests.filter((r) => r.status === 'PENDING').length} 个伴侣请求
                </h3>
                <p className="text-sm text-gray-500">选择接受或拒绝</p>
              </div>
            </div>
            <div className="space-y-3">
              {requests
                .filter((r) => r.status === 'PENDING')
                .map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-xl p-4 border border-pink-100 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-medium">
                        {req.sender?.nickname?.[0] || req.sender?.email?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">
                          {req.sender?.nickname || req.sender?.email || '未知用户'}
                        </p>
                        {req.message && (
                          <p className="text-xs text-gray-400 mt-0.5">{req.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(req.createdAt), 'M月d日 HH:mm', { locale: zhCN })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        disabled={actionLoading}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="拒绝"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            接受
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          </div>
        ) : hasPartner && partnerInfo ? (
          /* Partner Connected View */
          <PartnerConnectedView
            partner={partnerInfo}
            onDisconnect={handleDisconnect}
            actionLoading={actionLoading}
            userCode={user.partnerCode}
            onCopyCode={handleCopyCode}
            copied={copied}
          />
        ) : (
          /* No Partner View */
          <NoPartnerView
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            userCode={user.partnerCode}
            onCopyCode={handleCopyCode}
            copied={copied}
            partnerCode={partnerCode}
            setPartnerCode={setPartnerCode}
            message={message}
            setMessage={setMessage}
            onSendRequest={handleSendRequest}
            actionLoading={actionLoading}
            requests={requests}
            requestsLoading={requestsLoading}
          />
        )}
      </div>
    </PageLayout>
  );
}

function PartnerConnectedView({
  partner,
  onDisconnect,
  actionLoading,
  userCode,
  onCopyCode,
  copied,
}: {
  partner: PartnerInfo;
  onDisconnect: () => void;
  actionLoading: boolean;
  userCode: string | null;
  onCopyCode: () => void;
  copied: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Partner Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Gradient header */}
        <div className="h-24 bg-gradient-to-r from-primary to-secondary relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            {[1, 2, 3, 4].map((i) => (
              <Heart
                key={i}
                className="absolute text-white"
                size={24 + i * 8}
                style={{
                  top: `${10 + i * 20}%`,
                  left: `${5 + i * 25}%`,
                  opacity: 0.3,
                  transform: `rotate(${i * 30}deg)`,
                }}
                fill="currentColor"
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 -mt-12">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold">
              {partner.nickname?.[0] || partner.email?.[0] || '💕'}
            </div>
          </div>

          {/* Info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {partner.nickname || partner.email}
            </h2>
            <p className="text-gray-400 text-sm mt-1">{partner.email}</p>
            {partner.partnerSince && (
              <p className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-1">
                <Heart className="w-4 h-4 text-secondary" fill="currentColor" />
                连接于 {format(parseISO(partner.partnerSince), 'yyyy年M月d日', { locale: zhCN })}
                <Heart className="w-4 h-4 text-secondary" fill="currentColor" />
              </p>
            )}
          </div>

          {/* Connected status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-700 font-medium">已连接</span>
            </div>
          </div>

          {/* Partner code (optional display) */}
          {userCode && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">你的伴侣码</span>
                </div>
                <button
                  onClick={onCopyCode}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-all"
                >
                  {copied ? (
                    <><CheckCircle className="w-4 h-4" /> 已复制</>
                  ) : (
                    <><Copy className="w-4 h-4" /> 复制</>
                  )}
                </button>
              </div>
              <p className="text-lg font-mono font-bold text-gray-800 mt-1 tracking-wider select-all">
                {userCode}
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <Heart className="w-4 h-4 text-primary/40" fill="currentColor" />
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Disconnect button */}
          <button
            onClick={onDisconnect}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-all text-sm font-medium disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Unlink className="w-4 h-4" />
            )}
            解除伴侣连接
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function NoPartnerView({
  activeSection,
  setActiveSection,
  userCode,
  onCopyCode,
  copied,
  partnerCode,
  setPartnerCode,
  message,
  setMessage,
  onSendRequest,
  actionLoading,
  requests,
  requestsLoading,
}: {
  activeSection: 'overview' | 'invite' | 'connect';
  setActiveSection: (s: 'overview' | 'invite' | 'connect') => void;
  userCode: string | null;
  onCopyCode: () => void;
  copied: boolean;
  partnerCode: string;
  setPartnerCode: (s: string) => void;
  message: string;
  setMessage: (s: string) => void;
  onSendRequest: () => void;
  actionLoading: boolean;
  requests: PartnerRequest[];
  requestsLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Choice cards */}
      {activeSection === 'overview' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid md:grid-cols-2 gap-4"
        >
          {/* Invite card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveSection('invite')}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary/70 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Share2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              邀请伴侣
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              分享你的伴侣码，<br />
              让TA输入来建立连接
            </p>
            <div className="mt-4 flex items-center justify-center text-primary text-sm font-medium">
              <span>开始邀请</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </motion.button>

          {/* Connect card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveSection('connect')}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md hover:border-secondary/30 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-primary/70 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              连接伴侣
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              输入TA的伴侣码，<br />
              发送连接请求
            </p>
            <div className="mt-4 flex items-center justify-center text-secondary text-sm font-medium">
              <span>开始连接</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </motion.button>
        </motion.div>
      )}

      {/* Invite section */}
      {activeSection === 'invite' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => setActiveSection('overview')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            返回
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">邀请伴侣</h2>
                <p className="text-sm text-gray-400">分享你的伴侣码给TA</p>
              </div>
            </div>

            {userCode ? (
              <div className="space-y-6">
                {/* Code display */}
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-6 text-center border border-primary/10">
                  <p className="text-sm text-gray-500 mb-3">你的专属伴侣码</p>
                  <p className="text-3xl font-mono font-bold tracking-[0.3em] text-gray-800 select-all mb-4">
                    {userCode}
                  </p>
                  <button
                    onClick={onCopyCode}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      copied
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg'
                    }`}
                  >
                    {copied ? (
                      <><CheckCircle className="w-4 h-4" /> 已复制</>
                    ) : (
                      <><Copy className="w-4 h-4" /> 复制伴侣码</>
                    )}
                  </button>
                </div>

                {/* Instructions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    如何连接
                  </h4>
                  <div className="flex items-start gap-3 text-sm text-gray-500">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                      1
                    </div>
                    <p>将上方伴侣码发送给你的另一半</p>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-gray-500">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                      2
                    </div>
                    <p>TA在「连接伴侣」中输入你的伴侣码</p>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-gray-500">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                      3
                    </div>
                    <p>接受请求后，你们就建立了伴侣连接 💕</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-gray-400">加载中...</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Connect section */}
      {activeSection === 'connect' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => setActiveSection('overview')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            返回
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">连接伴侣</h2>
                <p className="text-sm text-gray-400">输入TA的伴侣码，发送连接请求</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Partner code input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  伴侣码 <span className="text-red-400">*</span>
                </label>
                <input
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value)}
                  placeholder="请输入TA的伴侣码"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono tracking-wider"
                />
              </div>

              {/* Optional message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  附加消息 <span className="text-gray-400 font-normal">（可选）</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="写一句温暖的话..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/200</p>
              </div>

              {/* Send button */}
              <button
                onClick={onSendRequest}
                disabled={actionLoading || !partnerCode.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                发送连接请求
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Past requests (non-pending) */}
      {requests.filter((r) => r.status !== 'PENDING').length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            历史请求
          </h3>
          <div className="space-y-2">
            {requests
              .filter((r) => r.status !== 'PENDING')
              .map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                      {req.sender?.nickname?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        {req.sender?.nickname || req.sender?.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(parseISO(req.createdAt), 'M月d日 HH:mm', { locale: zhCN })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    req.status === 'ACCEPTED'
                      ? 'bg-green-50 text-green-600'
                      : req.status === 'REJECTED'
                      ? 'bg-red-50 text-red-500'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {req.status === 'ACCEPTED' ? '已接受' : req.status === 'REJECTED' ? '已拒绝' : req.status}
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
