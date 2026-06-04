'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { memoryApi } from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isToday, addMonths, subMonths, parseISO
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Plus, X, Music, Camera,
  Image as ImageIcon, Mic, Send, Heart, Sparkles,
  Star as StarIcon, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface Star {
  id: string;
  date: string;
  title: string | null;
  content: string | null;
  mood: string | null;
  color: string;
  isLocked: boolean;
  _count?: { memories: number; photos: number };
  memories?: any[];
  photos?: any[];
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stars, setStars] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStarDate, setNewStarDate] = useState<Date | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchStars = useCallback(async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const { data } = await memoryApi.getStars(year, month);
      setStars(Array.isArray(data) ? data : data.stars || []);
    } catch (err: any) {
      console.error('Failed to fetch stars:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (user) {
      fetchStars();
    }
  }, [user, fetchStars]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDay = getDay(startOfMonth(currentMonth));

  const getStarForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return stars.find((s) => format(parseISO(s.date), 'yyyy-MM-dd') === dateStr);
  };

  const handleDayClick = async (date: Date) => {
    const star = getStarForDate(date);
    if (star) {
      try {
        const { data } = await memoryApi.getStar(star.id);
        setSelectedStar(data);
      } catch {
        setSelectedStar(star);
      }
    } else {
      setNewStarDate(date);
      setShowCreateModal(true);
    }
  };

  const handleCreateStar = async () => {
    if (!newStarDate) return;
    try {
      const dateStr = format(newStarDate, 'yyyy-MM-dd');
      const moods = ['😊', '🥰', '😢', '😤', '🤗', '✨', '💪', '😴'];
      const mood = moods[Math.floor(Math.random() * moods.length)];
      const colors = ['#FFD700', '#FF69B4', '#87CEEB', '#DDA0DD', '#FFA07A', '#98FB98'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const { data } = await memoryApi.createStar({
        date: dateStr,
        mood,
        color,
      });
      toast.success('新的一天已点亮 ✨');
      setShowCreateModal(false);
      setNewStarDate(null);
      fetchStars();
      // Open the newly created star
      const detail = await memoryApi.getStar(data.id || data.star?.id);
      setSelectedStar(detail.data || detail);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '创建失败');
    }
  };

  const handleAddMemory = async (starId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await memoryApi.addMemory(starId, { content });
      toast.success('记忆已添加 💫');
      const { data } = await memoryApi.getStar(starId);
      setSelectedStar(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '添加失败');
    }
  };

  const handleUpdateStar = async (starId: string, updates: any) => {
    try {
      await memoryApi.updateStar(starId, updates);
      toast.success('更新成功');
      fetchStars();
      if (selectedStar?.id === starId) {
        setSelectedStar((prev) => prev ? { ...prev, ...updates } : prev);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '更新失败');
    }
  };

  const fetchTimeline = async () => {
    try {
      const { data } = await memoryApi.getTimeline();
      setTimeline(data.stars || data || []);
      setShowTimeline(true);
    } catch {
      toast.error('获取时间线失败');
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

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StarIcon className="w-6 h-6 text-yellow-500" />
            星点记忆
          </h1>
          <p className="text-gray-500 mt-1">
            {user.hasPartner ? '✨ 双人时间线已合并' : '记录属于你的每一天'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/memory/v4"
            className="px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 text-primary rounded-xl text-sm hover:shadow-sm transition-all font-medium">
            ✎ 记忆册
          </Link>
          <button
            onClick={fetchTimeline}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:border-primary hover:text-primary transition-all"
          >
            时间线
          </button>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Star Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for start day */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {daysInMonth.map((date) => {
            const star = getStarForDate(date);
            const isTodayDate = isToday(date);

            return (
              <motion.button
                key={date.toISOString()}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDayClick(date)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${
                  isTodayDate ? 'ring-2 ring-primary ring-offset-2' : ''
                } ${
                  star
                    ? 'shadow-md hover:shadow-lg'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-400'
                }`}
                style={star ? { backgroundColor: star.color + '30', borderColor: star.color } : {}}
              >
                <span className={`text-sm font-medium ${star ? 'text-gray-800' : ''}`}>
                  {format(date, 'd')}
                </span>
                {star && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {star.mood && <span className="text-xs">{star.mood}</span>}
                    {(star._count?.memories || 0) > 0 && (
                      <span className="text-[10px] text-gray-400">·{star._count?.memories}</span>
                    )}
                  </div>
                )}
                {star && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-20"
                    style={{ backgroundColor: star.color }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Star Detail Modal */}
      <AnimatePresence>
        {selectedStar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedStar(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              {/* Star header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: selectedStar.color + '30' }}>
                      {selectedStar.mood || '✨'}
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">
                        {selectedStar.title || format(parseISO(selectedStar.date), 'M月d日')}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {format(parseISO(selectedStar.date), 'yyyy年M月d日 EEEE', { locale: zhCN })}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStar(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Color picker */}
                <div className="flex items-center gap-2">
                  {['#FFD700', '#FF69B4', '#87CEEB', '#DDA0DD', '#FFA07A', '#98FB98'].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleUpdateStar(selectedStar.id, { color })}
                      className={`w-6 h-6 rounded-full transition-all ${
                        selectedStar.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Content & Memories */}
              <div className="p-6 space-y-4">
                {selectedStar.content && (
                  <p className="text-gray-700 leading-relaxed">{selectedStar.content}</p>
                )}

                {/* Memories */}
                {selectedStar.memories?.map((memory: any) => (
                  <div key={memory.id} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700">{memory.content}</p>
                    {memory.voiceUrl && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                        <Mic className="w-4 h-4" />
                        <span>语音消息</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {format(parseISO(memory.createdAt), 'MM/dd HH:mm')}
                    </p>
                  </div>
                ))}

                {/* Photos */}
                {selectedStar.photos?.map((photo: any) => (
                  <img key={photo.id} src={photo.url} alt="memory"
                    className="rounded-xl w-full object-cover max-h-64" />
                ))}

                {/* Add memory input */}
                <MemoryInput
                  onSubmit={(content) => handleAddMemory(selectedStar.id, content)}
                />

                {/* Mood selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">心情：</span>
                  {['😊', '🥰', '😢', '😤', '🤗', '✨', '💪', '😴'].map((mood) => (
                    <button
                      key={mood}
                      onClick={() => handleUpdateStar(selectedStar.id, { mood })}
                      className={`text-lg transition-all hover:scale-125 ${
                        selectedStar.mood === mood ? 'scale-125' : 'opacity-50'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Star Modal */}
      <AnimatePresence>
        {showCreateModal && newStarDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowCreateModal(false); setNewStarDate(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">点亮这一天 ✨</h2>
              <p className="text-gray-500 mb-6">
                {format(newStarDate, 'yyyy年M月d日', { locale: zhCN })}
              </p>
              <div className="flex items-center gap-3 justify-center mb-6">
                <input
                  placeholder="给它一个名字..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                  maxLength={20}
                  id="star-title-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateStar();
                  }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCreateModal(false); setNewStarDate(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateStar}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all"
                >
                  点亮 ✨
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline Modal */}
      <AnimatePresence>
        {showTimeline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowTimeline(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">📅 时间线</h2>
                <button onClick={() => setShowTimeline(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {timeline.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <StarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>还没有记忆，开始记录吧</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((star: any) => (
                    <div key={star.id} className="flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full mt-1.5"
                          style={{ backgroundColor: star.color || '#FFD700' }} />
                        <div className="w-0.5 flex-1 bg-gray-200" />
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-400">
                          {format(parseISO(star.date), 'M月d日')}
                          {star.user?.nickname && ` · ${star.user.nickname}`}
                        </p>
                        <p className="mt-1">{star.content || star.title || '✨'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}

function MemoryInput({ onSubmit }: { onSubmit: (content: string) => void }) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="写下此刻的心情..."
        className="flex-1 bg-transparent px-3 py-2 outline-none text-sm"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
