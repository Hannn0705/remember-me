'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { petApi } from '@/lib/api';
import PageLayout from '@/components/layout/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Heart, Utensils, Gamepad2, Sparkles, Mic, Square, Play,
  Trash2, Users, Plus, ChevronRight, Volume2, Loader2,
  Star, Clock, Music, PawPrint, Gift
} from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  avatar: string | null;
  level: number;
  hunger: number;
  happiness: number;
  clean: number;
  energy: number;
  exp: number;
  members: PetMember[];
  voices: VoiceRecord[];
  activities: PetActivity[];
  _count?: { voices: number; activities: number };
  createdAt: string;
}

interface PetMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; nickname: string | null; avatarUrl: string | null; email?: string };
}

interface VoiceRecord {
  id: string;
  petId: string;
  userId: string;
  audioUrl: string;
  duration: number;
  transcript: string | null;
  createdAt: string;
  user?: { id: string; nickname: string | null; avatarUrl: string | null };
}

interface PetActivity {
  id: string;
  petId: string;
  userId: string;
  type: string;
  metadata: string | null;
  createdAt: string;
  user?: { id: string; nickname: string | null; avatarUrl: string | null };
}

const MAX_STAT = 100;
const STAT_COLORS: Record<string, string> = {
  hunger: '#FF6B6B',
  happiness: '#FFD93D',
  clean: '#6BCB77',
  energy: '#4D96FF',
};

const ACTIVITY_LABELS: Record<string, string> = {
  FEED: '喂食',
  PLAY: '玩耍',
  CLEAN: '清洁',
  VOICE: '录音',
  LOGIN: '加入',
  LEVEL_UP: '升级',
};

const ACTIVITY_ICONS: Record<string, any> = {
  FEED: Utensils,
  PLAY: Gamepad2,
  CLEAN: Sparkles,
  VOICE: Mic,
  LOGIN: Users,
  LEVEL_UP: Star,
};

export default function PetV3Page() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Activities
  const [activities, setActivities] = useState<PetActivity[]>([]);
  const [voices, setVoices] = useState<VoiceRecord[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadPets();
  }, [user]);

  const loadPets = async () => {
    try {
      const { data } = await petApi.getMy();
      const petList = Array.isArray(data) ? data : [];
      setPets(petList);
      if (petList.length > 0 && !activePet) {
        setActivePet(petList[0]);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const loadPetDetail = useCallback(async (petId: string) => {
    try {
      const [petRes, actsRes, voicesRes] = await Promise.all([
        petApi.get(petId),
        petApi.getActivities(petId),
        petApi.getVoices(petId),
      ]);
      setActivePet(petRes.data);
      setActivities(Array.isArray(actsRes.data) ? actsRes.data : []);
      setVoices(Array.isArray(voicesRes.data) ? voicesRes.data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '加载失败');
    }
  }, []);

  const switchPet = async (pet: Pet) => {
    setActivePet(pet);
    await loadPetDetail(pet.id);
  };

  const handleCreate = async () => {
    if (!newPetName.trim()) { toast.error('请为小精灵起个名字'); return; }
    setCreateLoading(true);
    try {
      const { data } = await petApi.create({ name: newPetName.trim() });
      toast.success('🎉 小精灵诞生了！');
      setShowCreate(false);
      setNewPetName('');
      await loadPets();
      setActivePet(data);
      await loadPetDetail(data.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '创建失败');
    } finally { setCreateLoading(false); }
  };

  const doAction = async (action: string) => {
    if (!activePet) return;
    setActionLoading(action);
    try {
      let data: any;
      switch (action) {
        case 'feed': data = await petApi.feed(activePet.id); break;
        case 'play': data = await petApi.play(activePet.id); break;
        case 'clean': data = await petApi.clean(activePet.id); break;
      }
      const msg = data?.data?.message || `${action}成功 ✨`;
      toast.success(msg);
      if (data?.data?.leveled?.leveled) {
        toast.success(`🎊 升级了！当前等级 ${data.data.leveled.newLevel}`);
      }
      await loadPetDetail(activePet.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '操作失败');
    } finally { setActionLoading(null); }
  };

  // ==================== Voice Recording ====================
  const startRecording = async () => {
    try {
      chunks.current = [];
      setAudioBlob(null);
      setAudioUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/webm',
      });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => { if (d >= 60) { stopRecording(); return 60; } return d + 1; });
      }, 1000);
    } catch {
      toast.error('无法访问麦克风');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const uploadVoice = async () => {
    if (!audioBlob || !activePet) return;
    setActionLoading('voice');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `voice-${Date.now()}.webm`);
      formData.append('duration', String(recordingDuration));
      await petApi.uploadVoice(activePet.id, formData);
      toast.success('语音已上传 🎙️');
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingDuration(0);
      await loadPetDetail(activePet.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '上传失败');
    } finally { setActionLoading(null); }
  };

  const playVoice = (url: string) => {
    if (playingAudio === url) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingAudio(null);
    audio.play();
    setPlayingAudio(url);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ==================== Render ====================

  if (authLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!user) return null;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PawPrint className="w-6 h-6 text-primary" />
              共同小精灵
            </h1>
            <p className="text-gray-500 text-sm mt-1">多人一起养的电子宠物</p>
          </div>
          <div className="flex items-center gap-3">
            {pets.length > 1 && (
              <select
                onChange={(e) => {
                  const pet = pets.find(p => p.id === e.target.value);
                  if (pet) switchPet(pet);
                }}
                value={activePet?.id || ''}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {pets.map(p => (
                  <option key={p.id} value={p.id}>{p.name} Lv.{p.level}</option>
                ))}
              </select>
            )}
            {!activePet && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-sm hover:shadow-lg transition-all">
                <Plus className="w-4 h-4" /> 领养精灵
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !activePet ? (
          /* Empty State - No Pet */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-6 flex items-center justify-center">
              <PawPrint className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">还没有小精灵</h2>
            <p className="text-gray-500 mb-8">领养一只小精灵，和伴侣一起照顾它吧</p>
            <button onClick={() => setShowCreate(true)}
              className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-all inline-flex items-center gap-2">
              <Gift className="w-5 h-5" /> 领养一只小精灵
            </button>
          </motion.div>
        ) : (
          /* Pet Dashboard */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Pet Avatar + Stats */}
            <div className="lg:col-span-1 space-y-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                {/* Pet Avatar */}
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center
                    ${activePet.happiness > 60 ? 'animate-float' : ''}`}>
                    <span className="text-5xl">{activePet.avatar || '🐱'}</span>
                  </div>
                  {/* Level Badge */}
                  <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-yellow-400 border-4 border-white flex items-center justify-center shadow-md">
                    <span className="text-xs font-bold text-white">{activePet.level}</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold">{activePet.name}</h2>
                <p className="text-sm text-gray-400">Lv.{activePet.level} · {activePet.members.length}人共同养育</p>

                {/* Exp Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>EXP</span>
                    <span>{activePet.exp % (activePet.level * 100)}/{activePet.level * 100}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-500"
                      style={{ width: `${(activePet.exp % (activePet.level * 100)) / (activePet.level * 100) * 100}%` }} />
                  </div>
                </div>
              </motion.div>

              {/* Stats */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                {[
                  { key: 'hunger', label: '饱食度', icon: Utensils },
                  { key: 'happiness', label: '快乐度', icon: Heart },
                  { key: 'clean', label: '清洁度', icon: Sparkles },
                  { key: 'energy', label: '精力', icon: Star },
                ].map(stat => (
                  <div key={stat.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-1.5">
                        <stat.icon className={`w-4 h-4`} style={{ color: STAT_COLORS[stat.key] }} />
                        <span className="text-gray-600">{stat.label}</span>
                      </div>
                      <span className="font-medium" style={{ color: STAT_COLORS[stat.key] }}>
                        {(activePet as any)[stat.key] || 0}
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((activePet as any)[stat.key] || 0) / MAX_STAT * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full transition-all"
                        style={{ backgroundColor: STAT_COLORS[stat.key] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Actions + Voice + Activity */}
            <div className="lg:col-span-2 space-y-4">
              {/* Action Buttons */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" /> 互动
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'feed', label: '喂食', icon: Utensils, color: 'from-orange-400 to-red-400' },
                    { key: 'play', label: '玩耍', icon: Gamepad2, color: 'from-green-400 to-emerald-400' },
                    { key: 'clean', label: '清洁', icon: Sparkles, color: 'from-blue-400 to-cyan-400' },
                  ].map(action => (
                    <button
                      key={action.key}
                      onClick={() => doAction(action.key)}
                      disabled={actionLoading === action.key}
                      className={`py-4 bg-gradient-to-br ${action.color} text-white rounded-xl font-medium
                        hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        flex flex-col items-center gap-2`}
                    >
                      {actionLoading === action.key ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <action.icon className="w-6 h-6" />
                      )}
                      <span className="text-sm">{action.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Voice Recording */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-pink-500" /> 语音录制
                </h3>

                {/* Recorder */}
                <div className="flex items-center gap-4 mb-4">
                  {!isRecording && !audioBlob && (
                    <button onClick={startRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg transition-all">
                      <Mic className="w-5 h-5" /> 开始录音
                    </button>
                  )}
                  {isRecording && (
                    <div className="flex items-center gap-4">
                      <button onClick={stopRecording}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl hover:shadow-lg transition-all animate-pulse">
                        <Square className="w-5 h-5" /> 停止录音
                      </button>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-mono text-lg">{formatDuration(recordingDuration)}</span>
                      </div>
                    </div>
                  )}
                  {audioBlob && !isRecording && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => audioUrl && playVoice(audioUrl)}
                        className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                        {playingAudio === audioUrl
                          ? <><Square className="w-5 h-5" /> 停止</>
                          : <><Play className="w-5 h-5" /> 试听</>}
                      </button>
                      <button onClick={uploadVoice} disabled={actionLoading === 'voice'}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
                        {actionLoading === 'voice'
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <><Mic className="w-5 h-5" /> 上传</>}
                      </button>
                      <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                        className="p-3 text-gray-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Voice List */}
                {voices.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {voices.map(v => (
                      <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <button onClick={() => playVoice(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${v.audioUrl}`)}
                          className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-100 transition-all">
                          {playingAudio === `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${v.audioUrl}`
                            ? <Square className="w-4 h-4 text-primary" />
                            : <Play className="w-4 h-4 text-primary" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{v.user?.nickname || '未知'}</p>
                          <p className="text-xs text-gray-400">{formatDuration(v.duration)} · {new Date(v.createdAt).toLocaleDateString('zh-CN')}</p>
                        </div>
                        {v.transcript && <p className="text-xs text-gray-500 truncate max-w-[120px]">{v.transcript}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Members */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" /> 共同养育者
                </h3>
                <div className="flex flex-wrap gap-3">
                  {activePet.members.map(m => (
                    <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-medium">
                        {m.user.nickname?.[0] || m.user.email?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.user.nickname || '用户'}</p>
                        <p className="text-xs text-gray-400">{m.role === 'OWNER' ? '主人' : '共同养育者'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Invite section */}
                <button onClick={() => toast.info('输入对方用户ID即可邀请（开发中）')}
                  className="mt-3 flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-all">
                  <Plus className="w-4 h-4" /> 邀请共同养育
                </button>
              </motion.div>

              {/* Activity Feed */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" /> 最近动态
                </h3>
                {activities.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">还没有动态</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activities.slice(0, 20).map((act, i) => {
                      const Icon = ACTIVITY_ICONS[act.type] || Star;
                      return (
                        <motion.div
                          key={act.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">{act.user?.nickname || '用户'}</span>
                              {' '}{ACTIVITY_LABELS[act.type] || act.type}
                              {act.type === 'LEVEL_UP' && act.metadata && (() => {
                                try { const m = JSON.parse(act.metadata); return ` → Lv.${m.to}`; } catch { return ''; }
                              })()}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(act.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}

        {/* Create Pet Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreate(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center text-4xl">
                  🐣
                </div>
                <h2 className="text-xl font-bold mb-2">领养小精灵</h2>
                <p className="text-gray-500 mb-6 text-sm">给它起一个可爱的名字吧</p>
                <input
                  value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)}
                  placeholder="输入名字..."
                  maxLength={20}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-lg font-medium
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all">
                    取消
                  </button>
                  <button onClick={handleCreate} disabled={createLoading || !newPetName.trim()}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl
                      hover:shadow-lg transition-all disabled:opacity-50">
                    {createLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '领养 ✨'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}
