'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Mic, Square, Play, Trash2, Image as ImageIcon, X,
  Heart, Send, Sparkles, Music, Loader2, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { memoryApi } from '@/lib/api';

interface DiaryEditorProps {
  date: Date;
  starId?: string;
  existingContent?: {
    title?: string;
    content?: string;
    mood?: string;
    color?: string;
  };
  onSave: (data: {
    title: string;
    content: string;
    mood: string;
    color: string;
    memories: { content: string; voiceUrl?: string }[];
    photos: File[];
  }) => void;
  onClose?: () => void;
}

const MOODS = [
  { emoji: '😊', label: '开心' },
  { emoji: '🥰', label: '心动' },
  { emoji: '😢', label: '难过' },
  { emoji: '😤', label: '生气' },
  { emoji: '🤗', label: '拥抱' },
  { emoji: '✨', label: '美好' },
  { emoji: '💪', label: '努力' },
  { emoji: '😴', label: '疲惫' },
  { emoji: '🎉', label: '庆祝' },
  { emoji: '☕', label: '日常' },
];

const COLORS = ['#FFD700', '#FF69B4', '#87CEEB', '#DDA0DD', '#FFA07A', '#98FB98', '#F0E68C', '#E6E6FA'];

export default function DiaryEditor({ date, starId, existingContent, onSave, onClose }: DiaryEditorProps) {
  const [title, setTitle] = useState(existingContent?.title || '');
  const [content, setContent] = useState(existingContent?.content || '');
  const [mood, setMood] = useState(existingContent?.mood || MOODS[0].emoji);
  const [color, setColor] = useState(existingContent?.color || COLORS[0]);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDur, setRecordingDur] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceTitle, setVoiceTitle] = useState('');
  const [voiceRecords, setVoiceRecords] = useState<{ blob: Blob; url: string; duration: number; title: string }[]>([]);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing memories/photos from star
  const [existingMemories, setExistingMemories] = useState<any[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (starId) {
      memoryApi.getStar(starId).then(({ data }) => {
        if (data.memories) setExistingMemories(data.memories);
        if (data.photos) setExistingPhotos(data.photos.map((p: any) => p.url));
      }).catch(() => {});
    }
  }, [starId]);

  // Cleanup
  useEffect(() => {
    return () => {
      photoPreviews.forEach(u => URL.revokeObjectURL(u));
      voiceRecords.forEach(v => URL.revokeObjectURL(v.url));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  // ===== Voice Recording =====
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
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
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

  const saveVoiceRecord = () => {
    if (!audioBlob || !audioUrl) return;
    setVoiceRecords(prev => [...prev, {
      blob: audioBlob,
      url: audioUrl,
      duration: recordingDur,
      title: voiceTitle || `语音 ${format(date, 'MM/dd')}`,
    }]);
    setAudioBlob(null);
    setAudioUrl(null);
    setVoiceTitle('');
    setRecordingDur(0);
    toast.success('语音已添加到日记');
  };

  const removeVoice = (index: number) => {
    setVoiceRecords(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const togglePlay = (url: string) => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  // ===== Photo Handling =====
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024 && f.type.startsWith('image/'));
    if (validFiles.length !== files.length) toast.error('部分图片超过10MB已跳过');

    setPhotos(prev => [...prev, ...validFiles]);
    setPhotoPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ===== Save =====
  const handleSave = () => {
    if (!title.trim() && !content.trim() && voiceRecords.length === 0 && photos.length === 0) {
      toast.error('请记录一些内容');
      return;
    }
    onSave({ title, content, mood, color, memories: voiceRecords.map(v => ({ content: v.title, voiceUrl: v.url })), photos });
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Date header */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-400 font-mono">
          {format(date, 'yyyy.MM.dd EE', { locale: zhCN })}
        </p>
      </div>

      {/* Mood picker */}
      <div className="flex items-center gap-1 flex-wrap justify-center mb-4">
        {MOODS.map(m => (
          <button
            key={m.emoji}
            onClick={() => setMood(m.emoji)}
            className={`text-xl p-1.5 rounded-lg transition-all ${mood === m.emoji ? 'scale-125 bg-gray-100 shadow-sm' : 'opacity-40 hover:opacity-80'}`}
            title={m.label}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-2 justify-center mb-4">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-125' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="给今天取个名字..."
        className="w-full text-center text-xl font-serif font-bold border-none outline-none bg-transparent mb-4 text-gray-800 placeholder-gray-300"
      />

      {/* Diary Paper Content */}
      <div className="diary-paper relative mb-4">
        <div className="min-h-[240px] p-6 font-serif leading-8 text-gray-700">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下今天的心情..."
            className="w-full min-h-[200px] bg-transparent border-none outline-none resize-none text-base leading-8 text-gray-700 placeholder-gray-300 font-serif"
            style={{ lineHeight: '32px' }}
          />
        </div>
      </div>

      {/* Existing photos (from server) */}
      {existingPhotos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">已上传的图片</p>
          <div className="flex gap-2 flex-wrap">
            {existingPhotos.map((url, i) => (
              <img key={i} src={url} alt="" className="w-20 h-20 rounded-xl object-cover shadow-sm" />
            ))}
          </div>
        </div>
      )}

      {/* New photo upload */}
      {photoPreviews.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {photoPreviews.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover shadow-sm" />
              <button onClick={() => removePhoto(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload & Record buttons */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary hover:text-primary transition-all">
          <ImageIcon className="w-4 h-4" /> 添加图片
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />

        {!isRecording && !audioBlob && (
          <button onClick={startRecording}
            className="flex items-center gap-1.5 px-4 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-pink-400 hover:text-pink-500 transition-all">
            <Mic className="w-4 h-4" /> 录音
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm text-red-500">{fmtTime(recordingDur)}</span>
            <button onClick={stopRecording}
              className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-all">
              <Square className="w-3 h-3" /> 停止
            </button>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
            <button onClick={() => audioUrl && togglePlay(audioUrl)}
              className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-100">
              {isPlaying ? <Square className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary" />}
            </button>
            <span className="font-mono text-xs text-gray-400">{fmtTime(recordingDur)}</span>
            <input value={voiceTitle} onChange={(e) => setVoiceTitle(e.target.value)}
              placeholder="语音备注..." className="text-xs border-none outline-none bg-transparent w-24 text-gray-600" />
            <button onClick={saveVoiceRecord}
              className="p-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
              className="p-1.5 text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Voice records list */}
      {voiceRecords.length > 0 && (
        <div className="space-y-1.5 mb-4">
          <p className="text-xs text-gray-400">本次录音 ({voiceRecords.length})</p>
          {voiceRecords.map((v, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
              <button onClick={() => togglePlay(v.url)}
                className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-100">
                {isPlaying ? <Square className="w-3.5 h-3.5 text-primary" /> : <Play className="w-3.5 h-3.5 text-primary" />}
              </button>
              <span className="text-sm text-gray-700 flex-1 truncate">{v.title}</span>
              <span className="font-mono text-xs text-gray-400">{fmtTime(v.duration)}</span>
              <button onClick={() => removeVoice(i)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save button */}
      <button onClick={handleSave}
        className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
        <Heart className="w-4 h-4" /> 保存日记
      </button>

      <style jsx>{`
        .diary-paper {
          background: #fffdf9;
          border-radius: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(0,0,0,0.02);
          background-image:
            linear-gradient(#f0ece4 1px, transparent 1px);
          background-size: 100% 32px;
          position: relative;
          border: 1px solid #f0e8e0;
        }
        .diary-paper::before {
          content: '';
          position: absolute;
          left: 40px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(212, 168, 168, 0.15);
        }
      `}</style>
    </div>
  );
}
