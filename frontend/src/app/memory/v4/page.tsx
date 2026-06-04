'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { memoryApi } from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Heart, Image as ImageIcon, Mic, Play, Square, X,
  Plus, Music, Sparkles, Camera, Loader2, Users, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

// ===================== Types =====================
interface Memory {
  id: string;
  date: string;
  title: string | null;
  content: string | null;
  mood: string | null;
  color: string;
  author?: '你' | 'TA' | '共同';
  authorName?: string;
  memories?: { id: string; content: string | null; voiceUrl: string | null; createdAt: string }[];
  photos?: { id: string; url: string }[];
}

// ===================== Mock Data =====================
const MOCK_MEMORIES: Memory[] = [
  {
    id: 'm1', date: '2025-06-04T10:30:00', title: '第一次一起看日落',
    content: '你说这是你见过最美的日落。\n天边的云被染成了粉红色，我们坐在山顶，风轻轻的。',
    mood: '🥰', color: '#D4A8A8', author: '你', authorName: '小星',
    photos: [{ id: 'p1', url: '' }],
    memories: [{ id: 'mp1', content: '心跳的感觉', voiceUrl: null, createdAt: '2025-06-04T10:30:00' }],
  },
  {
    id: 'm2', date: '2025-06-03T22:15:00', title: '深夜通话',
    content: '聊到凌晨三点，说到好笑的事一起笑到喘不过气。\n你说我笑点低，可你笑得比我还大声。',
    mood: '✨', color: '#E8C89A', author: 'TA', authorName: '月月',
    memories: [
      { id: 'mp2', content: '你的笑声最好听', voiceUrl: '/mock/voice1', createdAt: '2025-06-03T22:30:00' },
    ],
  },
  {
    id: 'm3', date: '2025-06-02T08:00:00', title: '你做的早餐',
    content: '煎蛋有点焦，但你说这是你最成功的一次。\n烤面包配牛奶，简单却很幸福。',
    mood: '😊', color: '#B5C8B8', author: '你', authorName: '小星',
  },
  {
    id: 'm4', date: '2025-06-01T15:00:00', title: '雨天的车站',
    content: '你跑过来的时候头发湿漉漉的。\n我们共用一把伞，你的肩膀都湿了。',
    mood: '💕', color: '#B8C8D4', author: 'TA', authorName: '月月',
  },
  {
    id: 'm5', date: '2025-05-28T19:00:00', title: '一起做饭',
    content: '番茄炒蛋差点变成黑暗料理，但我们吃得特别开心。\n你说以后要一起学做更多的菜。',
    mood: '🎉', color: '#DDA0DD', author: '共同', authorName: '共同记忆',
    photos: [{ id: 'p2', url: '' }],
  },
  {
    id: 'm6', date: '2025-05-25T11:00:00', title: '周末散步',
    content: '沿着河边走了好远，看到一只橘猫在晒太阳。\n你说它长得很像我——因为我们都爱睡觉。',
    mood: '☀️', color: '#F0E68C', author: '你', authorName: '小星',
  },
  {
    id: 'm7', date: '2025-05-20T20:00:00', title: '收到花的惊喜',
    content: '今天不是什么特别的日子，你却带了一束小雏菊回来。\n你说：想让你开心，不需要理由。',
    mood: '🥰', color: '#FF69B4', author: 'TA', authorName: '月月',
  },
  {
    id: 'm8', date: '2025-05-15T14:00:00', title: '逛书店',
    content: '我们在书店各看各的书，偶尔抬头对视一笑。\n最后买了一本诗集，你说要每晚读给我听。',
    mood: '📖', color: '#87CEEB', author: '共同', authorName: '共同记忆',
  },
];

// ===================== Page Component =====================
export default function MemoryV4Page() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('全部');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
  const getImageUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return `${API_BASE}/uploads/${url}`;
  };
  const photoPlaceholder = (i: number) => ['🌅', '🍳', '🌸', '☕', '📚', '🎵', '🖼️', '🌊'][i % 8];

  // Upload form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newMood, setNewMood] = useState('😊');
  const [newAuthor, setNewAuthor] = useState<'你' | 'TA' | '共同'>('你');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDur, setRecordingDur] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      // Load from API first, fallback to mock
      loadMemories();
    }
  }, [user]);

  const loadMemories = async () => {
    try {
      const { data } = await memoryApi.getTimeline();
      const timeline = (data?.stars || data || []);
      if (timeline.length > 0) {
        const mapped = timeline.map((s: any) => ({
          id: s.id, date: s.date, title: s.title, content: s.content,
          mood: s.mood, color: s.color || '#D4A8A8',
          author: s.user?.id === user?.id ? '你' : (user?.partnerId ? 'TA' : '共同'),
          authorName: s.user?.nickname || '用户',
          memories: s.memories || [], photos: s.photos || [],
        }));
        setMemories(mapped);
      } else {
        setMemories(MOCK_MEMORIES);
      }
    } catch {
      setMemories(MOCK_MEMORIES);
    } finally { setLoading(false); }
  };

  // Filter
  const filtered = filter === '全部' ? memories : memories.filter(m => m.author === filter);

  // Voice
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingDur(0);
      timerRef.current = setInterval(() => {
        setRecordingDur(d => { if (d >= 60) { stopRecording(); return 60; } return d + 1; });
      }, 1000);
    } catch { toast.error('无法访问麦克风'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const playVoice = (url: string) => {
    if (playingVoice === url) { audioRef.current?.pause(); setPlayingVoice(null); return; }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingVoice(null);
    audio.play();
    setPlayingVoice(url);
  };

  // Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.size <= 10 * 1024 * 1024);
    setUploadFiles(prev => [...prev, ...files]);
    setUploadPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const handleUpload = () => {
    if (!newTitle.trim() && !newContent.trim() && uploadFiles.length === 0 && !audioBlob) {
      toast.error('请记录一些回忆'); return;
    }
    const newMem: Memory = {
      id: 'm' + Date.now(), date: new Date().toISOString(),
      title: newTitle.trim() || undefined, content: newContent.trim() || undefined,
      mood: newMood, color: '#D4A8A8', author: newAuthor,
      authorName: newAuthor === '你' ? (user?.nickname || '你') : (newAuthor === 'TA' ? 'TA' : '共同'),
    };
    if (audioBlob && audioUrl) {
      newMem.memories = [{ id: 'vm' + Date.now(), content: '语音消息', voiceUrl: audioUrl, createdAt: new Date().toISOString() }];
    }
    setMemories(prev => [newMem, ...prev]);
    setShowUpload(false);
    resetUpload();
    toast.success('回忆已添加 ✨');
  };

  const resetUpload = () => {
    setNewTitle(''); setNewContent(''); setNewMood('😊'); setNewAuthor('你');
    setUploadFiles([]); uploadPreviews.forEach(u => URL.revokeObjectURL(u));
    setUploadPreviews([]); setAudioBlob(null); setAudioUrl(null);
  };

  const moods = ['😊', '🥰', '😢', '✨', '💕', '🎉', '☀️', '📖', '🎶', '🌙'];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return null;

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        {/* ====== Header ====== */}
        <div className="text-center mb-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-serif font-light tracking-wider text-[#4A4040]">
            记忆册
          </h1>
          <p className="text-sm text-[#8A7E7E] font-light mt-2 tracking-wide">
            属于我们两人的时光碎片
          </p>
          <div className="w-10 h-[1px] bg-[#D4A8A8] mx-auto mt-4 opacity-40" />
          </motion.div>
        </div>

        {/* ====== Filters ====== */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {['全部', '你', 'TA', '共同'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-500 font-light
                ${filter === f
                  ? 'bg-[#D4A8A8] text-white'
                  : 'border border-[rgba(180,160,160,0.12)] text-[#8A7E7E] hover:border-[#D4A8A8] hover:text-[#D4A8A8]'}`}>
              {f === '全部' ? '✦ 全部' : f === '你' ? '💫 你' : f === 'TA' ? '🌙 TA' : '✨ 共同'}
            </button>
          ))}
          <button onClick={() => setShowUpload(true)}
            className="ml-3 px-4 py-1.5 rounded-full text-xs bg-[#D4A8A8] text-white hover:bg-[#C89A9A] transition-all flex items-center gap-1">
            <Plus className="w-3 h-3" /> 添加回忆
          </button>
        </div>

        {/* ====== Scattered Memories Grid ====== */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#D4A8A8]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#BCB0B0]">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif text-lg font-light">还没有共同的回忆</p>
            <p className="text-sm mt-1">点击「添加回忆」开始记录</p>
          </div>
        ) : (
          <div className="scrapbook-grid">
            {filtered.map((mem, i) => {
              const size = (i % 7 === 0) ? 'large' : (i % 5 === 0) ? 'wide' : (i % 3 === 0) ? 'tall' : 'normal';
              return (
                <motion.div
                  key={mem.id}
                  layoutId={mem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 10) * 0.05, duration: 0.5 }}
                  className={`scrapbook-card size-${size}`}
                  style={{ borderColor: mem.color + '40' }}
                  onClick={() => setSelectedMemory(mem)}
                >
                  {/* Author badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-light tracking-wide
                      ${mem.author === '你' ? 'bg-[#D4A8A8]/10 text-[#D4A8A8]' :
                        mem.author === 'TA' ? 'bg-[#C4B5D4]/10 text-[#C4B5D4]' :
                        'bg-[#B5C8B8]/10 text-[#B5C8B8]'}`}>
                      {mem.author === '你' ? '💫 你' : mem.author === 'TA' ? '🌙 TA' : '✨ 共同'}
                    </span>
                  </div>

                  {/* Photos */}
                  {mem.photos && mem.photos.length > 0 && (
                    <div className={`photo-strip ${size === 'large' ? 'h-48' : 'h-32'}`}>
                      <div className="flex gap-1 h-full">
                        {mem.photos.slice(0, 3).map((p, pi) => (
                          <div key={p.id} className={`${mem.photos!.length === 1 ? 'w-full' : 'flex-1'} rounded-lg overflow-hidden bg-[#F8F0EA]`}>
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {getImageUrl(p.url) ? (
                                <img src={getImageUrl(p.url)!} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="opacity-30">{photoPlaceholder(pi)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    {/* Mood + Date */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{mem.mood || '💕'}</span>
                      <span className="text-[10px] text-[#BCB0B0] font-mono tracking-wide">
                        {format(parseISO(mem.date), 'M.dd')}
                      </span>
                    </div>

                    {/* Title */}
                    {mem.title && (
                      <h3 className="font-serif font-medium text-sm text-[#4A4040] mb-1.5 leading-relaxed">
                        {mem.title}
                      </h3>
                    )}

                    {/* Content */}
                    {mem.content && (
                      <p className={`text-xs text-[#8A7E7E] font-light leading-relaxed ${size === 'normal' ? 'line-clamp-3' : 'line-clamp-4'}`}>
                        {mem.content}
                      </p>
                    )}

                    {/* Voice indicator */}
                    {mem.memories?.some(m => m.voiceUrl) && (
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#C4B5D4]">
                        <Music className="w-3 h-3" />
                        <span>语音</span>
                      </div>
                    )}
                  </div>

                  {/* Color accent */}
                  <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-30"
                    style={{ backgroundColor: mem.color }} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== Memory Detail Overlay ====== */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(253,248,244,0.88)', backdropFilter: 'blur(40px)' }}
            onClick={() => setSelectedMemory(null)}>
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-8"
              style={{ boxShadow: '0 20px 60px rgba(160,140,140,0.12)' }}>
              <button onClick={() => setSelectedMemory(null)}
                className="float-right w-8 h-8 rounded-full bg-[#E8E4E0] flex items-center justify-center text-[#8A7E7E] hover:bg-[#D4A8A8] hover:text-white transition-all text-sm">
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{selectedMemory.mood || '💕'}</span>
                <div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-light
                    ${selectedMemory.author === '你' ? 'bg-[#D4A8A8]/10 text-[#D4A8A8]' :
                      selectedMemory.author === 'TA' ? 'bg-[#C4B5D4]/10 text-[#C4B5D4]' :
                      'bg-[#B5C8B8]/10 text-[#B5C8B8]'}`}>
                    {selectedMemory.author === '你' ? '💫 你' : selectedMemory.author === 'TA' ? '🌙 TA' : '✨ 共同'}
                  </span>
                  <p className="text-xs text-[#BCB0B0] font-mono mt-0.5">
                    {format(parseISO(selectedMemory.date), 'yyyy.M.dd HH:mm')}
                  </p>
                </div>
              </div>

              {selectedMemory.title && (
                <h2 className="font-serif text-xl font-light text-[#4A4040] mb-4 tracking-wide">
                  {selectedMemory.title}
                </h2>
              )}

              <div className="diary-body mb-6">
                {selectedMemory.content ? (
                  <p className="text-sm text-[#8A7E7E] leading-8 whitespace-pre-wrap font-light">
                    {selectedMemory.content}
                  </p>
                ) : (
                  <p className="text-sm text-[#BCB0B0] italic font-light">没有文字记录</p>
                )}
              </div>

              {/* Detail Photos */}
              {selectedMemory.photos && selectedMemory.photos.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {selectedMemory.photos.map((p, pi) => (
                    <div key={p.id}
                      className="w-24 h-24 rounded-xl overflow-hidden bg-[#F8F0EA] cursor-pointer hover:shadow-md transition-all flex items-center justify-center"
                      onClick={() => {
                        const url = getImageUrl(p.url);
                        if (url) setExpandedPhoto(url);
                      }}>
                      {getImageUrl(p.url) ? (
                        <img src={getImageUrl(p.url)!} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl opacity-40">{photoPlaceholder(pi)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Voice Playback */}
              {selectedMemory.memories?.filter(m => m.voiceUrl).map(mem => (
                <div key={mem.id}
                  className="flex items-center gap-3 bg-[#FDF8F4] px-4 py-3 rounded-xl mb-2 border border-[rgba(180,160,160,0.08)]">
                  <button onClick={() => playVoice(mem.voiceUrl!)}
                    className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-[#F8F0EA] transition-all">
                    {playingVoice === mem.voiceUrl
                      ? <Square className="w-3.5 h-3.5 text-[#D4A8A8]" />
                      : <Play className="w-3.5 h-3.5 text-[#D4A8A8] ml-0.5" />}
                  </button>
                  <Music className="w-4 h-4 text-[#BCB0B0]" />
                  {mem.content && <span className="text-xs text-[#8A7E7E]">{mem.content}</span>}
                </div>
              ))}

              {selectedMemory.memories?.filter(m => m.content && !m.voiceUrl).map(mem => (
                <div key={mem.id} className="text-xs text-[#8A7E7E] bg-[#FDF8F4] px-4 py-2 rounded-xl mb-1 border border-[rgba(180,160,160,0.06)]">
                  {mem.content}
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Upload Modal ====== */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(253,248,244,0.88)', backdropFilter: 'blur(40px)' }}
            onClick={() => { setShowUpload(false); resetUpload(); }}>
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8">
              <button onClick={() => { setShowUpload(false); resetUpload(); }}
                className="float-right w-8 h-8 rounded-full bg-[#E8E4E0] flex items-center justify-center text-[#8A7E7E] hover:bg-[#D4A8A8] hover:text-white transition-all text-sm">
                ✕
              </button>
              <h2 className="font-serif text-xl font-light text-[#4A4040] mb-6 tracking-wide">添加回忆</h2>

              {/* Author selector */}
              <div className="flex gap-2 mb-4">
                {(['你', 'TA', '共同'] as const).map(a => (
                  <button key={a} onClick={() => setNewAuthor(a)}
                    className={`px-4 py-1.5 rounded-full text-xs transition-all
                      ${newAuthor === a ? 'bg-[#D4A8A8] text-white' : 'border border-[rgba(180,160,160,0.12)] text-[#8A7E7E]'}`}>
                    {a === '你' ? '💫 你' : a === 'TA' ? '🌙 TA' : '✨ 共同'}
                  </button>
                ))}
              </div>

              {/* Mood */}
              <div className="flex gap-1 flex-wrap mb-4">
                {moods.map(m => (
                  <button key={m} onClick={() => setNewMood(m)}
                    className={`text-lg p-1 rounded transition-all ${newMood === m ? 'scale-125' : 'opacity-40'}`}>
                    {m}
                  </button>
                ))}
              </div>

              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="给这段回忆取个名字..." maxLength={40}
                className="w-full px-0 py-2 border-0 border-b border-[rgba(180,160,160,0.15)] bg-transparent text-sm text-[#4A4040] outline-none focus:border-[#D4A8A8] transition-colors font-serif mb-4" />

              <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)}
                placeholder="写下这段回忆..." rows={4}
                className="w-full px-0 py-2 border-0 border-b border-[rgba(180,160,160,0.15)] bg-transparent text-sm text-[#8A7E7E] outline-none focus:border-[#D4A8A8] transition-colors resize-none font-light mb-4" />

              {/* Photo upload */}
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-[rgba(180,160,160,0.2)] rounded-full text-xs text-[#8A7E7E] hover:border-[#D4A8A8] hover:text-[#D4A8A8] transition-all">
                  <Camera className="w-3 h-3" /> 图片
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />

                {!isRecording && !audioBlob && (
                  <button onClick={startRecording}
                    className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-[rgba(180,160,160,0.2)] rounded-full text-xs text-[#8A7E7E] hover:border-[#D4A8A8] hover:text-[#D4A8A8] transition-all">
                    <Mic className="w-3 h-3" /> 录音
                  </button>
                )}
                {isRecording && (
                  <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-mono text-xs">{Math.floor(recordingDur/60)}:{(recordingDur%60).toString().padStart(2,'0')}</span>
                    <button onClick={stopRecording} className="text-xs text-red-500">停止</button>
                  </div>
                )}
                {audioBlob && (
                  <div className="flex items-center gap-2 bg-[#F8F0EA] px-3 py-1.5 rounded-full">
                    <button onClick={() => audioUrl && playVoice(audioUrl)} className="text-xs">
                      {playingVoice === audioUrl ? '⏹' : '▶'}
                    </button>
                    <span className="text-xs text-[#8A7E7E]">语音</span>
                    <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }} className="text-xs text-[#BCB0B0]">✕</button>
                  </div>
                )}
              </div>

              {uploadPreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {uploadPreviews.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#F8F0EA]">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => { setUploadFiles(f => f.filter((_, j) => j !== i)); setUploadPreviews(p => { URL.revokeObjectURL(p[i]); return p.filter((_, j) => j !== i); }); }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4A8A8] text-white rounded-full flex items-center justify-center text-[8px]">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleUpload}
                className="w-full py-2.5 rounded-full bg-[#D4A8A8] text-white text-sm tracking-wide hover:bg-[#C89A9A] transition-all font-light">
                ✦ 保存回忆
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Photo Lightbox ====== */}
      <AnimatePresence>
        {expandedPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
            onClick={() => setExpandedPhoto(null)}>
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              src={expandedPhoto} alt="" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Styles ====== */}
      <style jsx>{`
        .scrapbook-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
          grid-auto-flow: dense;
        }
        .scrapbook-card {
          position: relative;
          background: rgba(255,252,248,0.88);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(180,160,160,0.12);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.6s ease;
        }
        .scrapbook-card:hover {
          box-shadow: 0 8px 30px rgba(160,140,140,0.12);
          transform: translateY(-3px);
        }
        .size-large { grid-column: span 2; grid-row: span 2; }
        .size-wide { grid-column: span 2; }
        .size-tall { grid-row: span 2; }
        .size-normal { }
        .photo-strip { padding: 1rem 1rem 0; }
        .diary-body {
          background: #fffdf9;
          border-radius: 12px;
          padding: 1.2rem 1.5rem;
          background-image: linear-gradient(#f0ece4 1px, transparent 1px);
          background-size: 100% 32px;
          border: 1px solid #f0e8e0;
        }
        @media (max-width: 768px) {
          .scrapbook-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          }
          .size-large, .size-wide { grid-column: span 1; grid-row: span 1; }
          .size-tall { grid-row: span 1; }
        }
      `}</style>
    </PageLayout>
  );
}
