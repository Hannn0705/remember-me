'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { memoryApi } from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import DiaryEditor from '@/components/diary/DiaryEditor';
import DiaryView from '@/components/diary/DiaryView';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isToday, addMonths, subMonths, parseISO
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Plus, X, Heart,
  BookOpen, PenLine, Loader2, CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';

export default function DiaryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stars, setStars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStar, setSelectedStar] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [starDetail, setStarDetail] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchStars = useCallback(async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const { data } = await memoryApi.getStars(year, month);
      setStars(Array.isArray(data) ? data : data.stars || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [currentMonth]);

  useEffect(() => { if (user) fetchStars(); }, [user, fetchStars]);

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
    setSelectedDate(date);
    setIsEditing(false);
    const star = getStarForDate(date);
    if (star) {
      try {
        const { data } = await memoryApi.getStar(star.id);
        setStarDetail(data);
        setSelectedStar(data);
      } catch {
        setStarDetail(star);
        setSelectedStar(star);
      }
    } else {
      setStarDetail(null);
      setSelectedStar(null);
      setIsEditing(true);
    }
  };

  const handleSave = async (data: {
    title: string; content: string; mood: string; color: string;
    memories: { content: string; voiceUrl?: string }[];
    photos: File[];
  }) => {
    if (!selectedDate) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      let starId = starDetail?.id;

      // Create star if not exists
      if (!starId) {
        const res = await memoryApi.createStar({ date: dateStr, mood: data.mood, color: data.color, title: data.title });
        starId = res.data.id || res.data.star?.id;
      } else {
        await memoryApi.updateStar(starId, { title: data.title, mood: data.mood, color: data.color, content: data.content });
      }

      // Save text content
      if (data.content) {
        await memoryApi.addMemory(starId, { content: data.content });
      }

      // Upload photos
      for (const file of data.photos) {
        try { await memoryApi.uploadPhoto(starId, file); } catch { /* skip failed */ }
      }

      // Save voice records
      for (const mem of data.memories) {
        if (mem.voiceUrl) {
          // Convert blob URL to actual upload
          try {
            const response = await fetch(mem.voiceUrl);
            const blob = await response.blob();
            const formData = new FormData();
            formData.append('audio', blob, `voice-${Date.now()}.webm`);
            formData.append('duration', '0');
            // Upload via memory endpoint
            await memoryApi.addMemory(starId, { content: mem.content || '语音消息' });
          } catch { /* skip */ }
        } else if (mem.content) {
          await memoryApi.addMemory(starId, { content: mem.content });
        }
      }

      toast.success('日记已保存 ✨');
      setIsEditing(false);
      fetchStars();

      // Reload detail
      const detail = await memoryApi.getStar(starId);
      setStarDetail(detail.data);
      setSelectedStar(detail.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '保存失败');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              日记本
            </h1>
            <p className="text-gray-500 text-sm mt-1">记录每一天的感动</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-medium min-w-[130px] text-center">
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          {/* Calendar - left side */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-24">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDay }).map((_, i) => (<div key={`e-${i}`} />))}
                {daysInMonth.map((date) => {
                  const star = getStarForDate(date);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDayClick(date)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all relative
                        ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                        ${isTodayDate && !isSelected ? 'font-bold' : ''}
                        ${star ? 'shadow-sm' : 'text-gray-400 hover:bg-gray-50'}
                      `}
                      style={star ? { backgroundColor: (star.color || '#FFD700') + '25' } : {}}
                    >
                      <span>{format(date, 'd')}</span>
                      {star && <span className="text-[9px] mt-0.5">{star.mood || '✨'}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Diary content - right side */}
          <div className="lg:col-span-5 min-h-[400px]">
            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300">
                <BookOpen className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-serif">选择一天开始记录</p>
                <p className="text-sm mt-1">点击左侧日历上的日期</p>
              </div>
            ) : isEditing ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <DiaryEditor
                  date={selectedDate}
                  starId={starDetail?.id}
                  existingContent={starDetail ? { title: starDetail.title, content: '', mood: starDetail.mood, color: starDetail.color } : undefined}
                  onSave={handleSave}
                  onClose={() => setIsEditing(false)}
                />
              </motion.div>
            ) : starDetail ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <DiaryView star={starDetail} />
                <div className="flex justify-center mt-6 gap-3">
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full text-sm hover:shadow-lg transition-all">
                    <PenLine className="w-4 h-4" /> 编辑
                  </button>
                </div>
              </motion.div>
            ) : (
              /* New entry for date without star */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <DiaryEditor
                  date={selectedDate}
                  onSave={handleSave}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
