'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { letterApi } from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Heart, Mail, PenLine, Clock, Send, X, ChevronLeft,
  Loader2, Trash2, CheckCircle, Calendar, FileText,
  Eye, EyeOff, Sparkles, MessagesSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface Letter {
  id: string;
  title: string;
  content: string;
  isDraft: boolean;
  isRead: boolean;
  scheduledAt: string | null;
  createdAt: string;
  sender: { id: string; nickname: string | null; avatarUrl: string | null };
  receiver: { id: string; nickname: string | null; avatarUrl: string | null };
}

type Tab = 'inbox' | 'outbox' | 'compose';

const FLOATING_HEARTS = [
  { id: 1, left: '10%', delay: 0, size: 16 },
  { id: 2, left: '25%', delay: 1.2, size: 12 },
  { id: 3, left: '45%', delay: 0.6, size: 20 },
  { id: 4, left: '65%', delay: 2.0, size: 14 },
  { id: 5, left: '80%', delay: 0.3, size: 18 },
  { id: 6, left: '90%', delay: 1.8, size: 10 },
];

export default function LettersPage() {
  const { user, loading: authLoading, hasPartner } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [inbox, setInbox] = useState<Letter[]>([]);
  const [outbox, setOutbox] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);

  // Compose form state
  const [title, setTitle] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [content, setContent] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxRes, outboxRes] = await Promise.all([
        letterApi.getInbox(),
        letterApi.getOutbox(),
      ]);
      setInbox(Array.isArray(inboxRes.data) ? inboxRes.data : inboxRes.data.letters || []);
      setOutbox(Array.isArray(outboxRes.data) ? outboxRes.data : outboxRes.data.letters || []);
    } catch (err: any) {
      console.error('Failed to fetch letters:', err);
      toast.error('获取信件列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchLetters();
    }
  }, [user, fetchLetters]);

  const handleOpenLetter = async (letter: Letter) => {
    setSelectedLetter(letter);
    if (!letter.isRead && activeTab === 'inbox') {
      try {
        await letterApi.markAsRead(letter.id);
        setInbox((prev) =>
          prev.map((l) => (l.id === letter.id ? { ...l, isRead: true } : l))
        );
      } catch {
        // Silently fail
      }
    }
    // Fetch full detail
    try {
      setLetterLoading(true);
      const { data } = await letterApi.getOne(letter.id);
      setSelectedLetter(data);
    } catch {
      // Use existing data
    } finally {
      setLetterLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await letterApi.delete(id);
      toast.success('信件已删除');
      setInbox((prev) => prev.filter((l) => l.id !== id));
      setOutbox((prev) => prev.filter((l) => l.id !== id));
      if (selectedLetter?.id === id) setSelectedLetter(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '删除失败');
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    if (!hasPartner && !receiverId.trim()) {
      toast.error('请填写收件人');
      return;
    }
    setComposing(true);
    try {
      await letterApi.create({
        receiverId: receiverId.trim() || undefined as any,
        title: title.trim(),
        content: content.trim(),
        scheduledAt: scheduled && scheduledAt ? scheduledAt : undefined,
      });
      toast.success(scheduled ? '信件已定时发送 💌' : '情书已寄出 💌');
      setTitle('');
      setContent('');
      setReceiverId('');
      setScheduled(false);
      setScheduledAt('');
      setActiveTab('outbox');
      fetchLetters();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '发送失败');
    } finally {
      setComposing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    setComposing(true);
    try {
      await letterApi.create({
        receiverId: receiverId.trim() || undefined as any,
        title: title.trim(),
        content: content.trim(),
        isDraft: true,
      });
      toast.success('草稿已保存 📝');
      setTitle('');
      setContent('');
      setReceiverId('');
      setScheduled(false);
      setScheduledAt('');
      setActiveTab('outbox');
      fetchLetters();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '保存草稿失败');
    } finally {
      setComposing(false);
    }
  };

  const handleScheduleFromOutbox = async (id: string, scheduledAt: string) => {
    try {
      await letterApi.schedule(id, scheduledAt);
      toast.success('信件已定时');
      fetchLetters();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '定时失败');
    }
  };

  const getStatusBadge = (letter: Letter) => {
    if (letter.isDraft) {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
          <FileText className="w-3 h-3" />
          草稿
        </span>
      );
    }
    if (letter.scheduledAt) {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
          <Clock className="w-3 h-3" />
          定时
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">
        <CheckCircle className="w-3 h-3" />
        已发送
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'inbox', label: '收件箱', icon: <Mail className="w-4 h-4" /> },
    { key: 'outbox', label: '发件箱', icon: <Send className="w-4 h-4" /> },
    { key: 'compose', label: '写情书', icon: <PenLine className="w-4 h-4" /> },
  ];

  return (
    <PageLayout>
      {/* Floating hearts decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {FLOATING_HEARTS.map((heart) => (
          <motion.div
            key={heart.id}
            className="absolute text-primary/10"
            style={{ left: heart.left, top: '-5%' }}
            animate={{
              y: ['0vh', '110vh'],
              opacity: [0, 0.4, 0.2, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 12 + heart.id * 2,
              repeat: Infinity,
              delay: heart.delay,
              ease: 'linear',
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
            情书
          </h1>
          <p className="text-gray-500 mt-1">
            用文字传递心底的温柔
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key="inbox"
          >
            <LetterList
              letters={inbox}
              loading={loading}
              emptyIcon={<Mail className="w-12 h-12" />}
              emptyText="收件箱空空如也"
              emptySubtext="等待一封来自TA的情书吧"
              onOpen={handleOpenLetter}
              onDelete={handleDelete}
              isInbox
            />
          </motion.div>
        )}

        {/* Outbox Tab */}
        {activeTab === 'outbox' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key="outbox"
          >
            <LetterList
              letters={outbox}
              loading={loading}
              emptyIcon={<Send className="w-12 h-12" />}
              emptyText="还没有发过情书"
              emptySubtext="去写一封给TA的情书吧"
              onOpen={handleOpenLetter}
              onDelete={handleDelete}
              isInbox={false}
            />
          </motion.div>
        )}

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key="compose"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">写一封情书</h2>
                  <p className="text-sm text-gray-400">写下你想对TA说的话</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    标题 <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="给这封信取一个名字..."
                    maxLength={100}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* Receiver */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    收件人
                  </label>
                  {hasPartner ? (
                    <input
                      value={receiverId}
                      onChange={(e) => setReceiverId(e.target.value)}
                      placeholder="输入收件人ID（留空自动发送给伴侣）"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                      <Heart className="w-4 h-4 shrink-0" />
                      <span>请先连接伴侣才能发送情书</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    内容 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="写下你的心里话..."
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    style={{ minHeight: '200px' }}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {(content.length || 0).toLocaleString()} 字
                  </p>
                </div>

                {/* Scheduled send */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduled}
                      onChange={(e) => setScheduled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-secondary" />
                  </label>
                  <span className="text-sm text-gray-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" />
                    定时发送
                  </span>
                </div>

                {scheduled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={composing}
                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    保存草稿
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={composing || !hasPartner}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 ml-auto"
                  >
                    {composing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {scheduled ? '定时发送' : '寄出情书'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Letter Detail Modal */}
      <AnimatePresence>
        {selectedLetter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLetter(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            >
              {/* Letter header decorations */}
              <div className="relative bg-gradient-to-r from-primary/5 to-secondary/5 p-6 border-b border-gray-100">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-t-2xl" />
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white animate-heartbeat" fill="currentColor" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">
                        {selectedLetter.title || '无标题'}
                      </h2>
                      <p className="text-xs text-gray-400">
                        {format(parseISO(selectedLetter.createdAt), 'yyyy年M月d日 HH:mm', { locale: zhCN })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLetter(null)}
                    className="p-1.5 hover:bg-white/50 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {activeTab === 'inbox' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">来自：</span>
                      <span className="font-medium text-gray-700">
                        {selectedLetter?.sender?.nickname || selectedLetter?.sender?.email || '未知'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">发送给：</span>
                      <span className="font-medium text-gray-700">
                        {selectedLetter?.receiver?.nickname || selectedLetter?.receiver?.email || '未知'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {activeTab === 'outbox' && getStatusBadge(selectedLetter)}
                    {activeTab === 'inbox' && (
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        selectedLetter.isRead
                          ? 'bg-green-50 text-green-600'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {selectedLetter.isRead ? (
                          <><Eye className="w-3 h-3" /> 已读</>
                        ) : (
                          <><EyeOff className="w-3 h-3" /> 未读</>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Letter content */}
              <div className="p-6">
                {letterLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="letter-paper min-h-[300px]">
                    {selectedLetter?.content ? (
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                        {selectedLetter.content}
                      </p>
                    ) : (
                      <p className="text-gray-400 italic">暂无内容</p>
                    )}
                  </div>
                )}

                {/* Footer hearts */}
                <div className="flex items-center justify-center gap-2 mt-6 text-primary/30">
                  <Heart className="w-4 h-4" fill="currentColor" />
                  <Heart className="w-5 h-5 animate-heartbeat" fill="currentColor" style={{ animationDelay: '0.3s' }} />
                  <Heart className="w-4 h-4" fill="currentColor" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}

// Letter list sub-component
function LetterList({
  letters,
  loading,
  emptyIcon,
  emptyText,
  emptySubtext,
  onOpen,
  onDelete,
  isInbox,
}: {
  letters: Letter[];
  loading: boolean;
  emptyIcon: React.ReactNode;
  emptyText: string;
  emptySubtext: string;
  onOpen: (letter: Letter) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  isInbox: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 shimmer rounded" />
                <div className="h-3 w-2/3 shimmer rounded" />
                <div className="h-3 w-1/4 shimmer rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (letters.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
      >
        <div className="text-gray-300 mb-4 flex justify-center">
          {emptyIcon}
        </div>
        <p className="text-gray-500 font-medium">{emptyText}</p>
        <p className="text-gray-400 text-sm mt-1">{emptySubtext}</p>
        <Heart className="w-6 h-6 text-primary/20 mx-auto mt-4" fill="currentColor" />
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {letters.map((letter, index) => (
          <motion.div
            key={letter.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onOpen(letter)}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group relative overflow-hidden ${
              isInbox && !letter.isRead ? 'border-l-4 border-l-primary' : ''
            }`}
          >
            {/* Decorative corner heart */}
            <div className="absolute -top-3 -right-3 text-primary/5">
              <Heart className="w-12 h-12" fill="currentColor" />
            </div>

            <div className="flex items-start gap-4 relative">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 ${
                isInbox
                  ? 'bg-gradient-to-br from-primary to-secondary'
                  : 'bg-gradient-to-br from-purple-400 to-pink-400'
              }`}>
                {isInbox
                  ? (letter.sender?.nickname?.[0] || '?')
                  : (letter.receiver?.nickname?.[0] || '?')
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`font-medium truncate ${isInbox && !letter.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                    {letter.title || '无标题'}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {isInbox && !letter.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                    {!isInbox && getStatusBadgeComponent(letter)}
                  </div>
                </div>

                <p className="text-sm text-gray-400 truncate mb-1">
                  {isInbox
                    ? `来自 ${letter.sender?.nickname || 'TA'}`
                    : `给 ${letter.receiver?.nickname || 'TA'}`
                  }
                </p>

                <p className="text-sm text-gray-500 line-clamp-1">
                  {letter.content || '（空白）'}
                </p>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {format(parseISO(letter.createdAt), 'M月d日 HH:mm', { locale: zhCN })}
                  </span>
                  <button
                    onClick={(e) => onDelete(letter.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Read indicator for inbox */}
            {isInbox && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-50 rounded-b-2xl overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: letter.isRead ? '100%' : '30%' }}
                  animate={{ width: letter.isRead ? '100%' : '30%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getStatusBadgeComponent(letter: Letter) {
  if (letter.isDraft) {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
        <FileText className="w-3 h-3" />
        草稿
      </span>
    );
  }
  if (letter.scheduledAt) {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
        <Clock className="w-3 h-3" />
        定时
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">
      <CheckCircle className="w-3 h-3" />
      已发送
    </span>
  );
}
