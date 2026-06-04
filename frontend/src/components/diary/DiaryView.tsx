'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Play, Square, Music, Heart, Image as ImageIcon } from 'lucide-react';

interface DiaryViewProps {
  star: {
    id: string;
    date: string;
    title: string | null;
    content: string | null;
    mood: string | null;
    color: string;
    memories?: { id: string; content: string | null; voiceUrl: string | null; createdAt: string }[];
    photos?: { id: string; url: string; thumbUrl?: string | null }[];
  };
}

export default function DiaryView({ star }: DiaryViewProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const date = parseISO(star.date);
  const hasContent = star.content || star.memories?.length || star.photos?.length;

  const playVoice = (url: string) => {
    if (playingVoice === url) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingVoice(null);
    audio.play();
    setPlayingVoice(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      {/* Date */}
      <div className="text-center mb-3">
        <span className="text-xs text-gray-400 font-mono tracking-wider">
          {format(date, 'yyyy.MM.dd EE', { locale: zhCN })}
        </span>
      </div>

      {/* Mood */}
      {star.mood && (
        <div className="text-center mb-4">
          <span className="text-3xl">{star.mood}</span>
        </div>
      )}

      {/* Title */}
      {star.title && (
        <h2 className="text-center text-xl font-serif font-bold text-gray-800 mb-6 tracking-wide">
          {star.title}
        </h2>
      )}

      {/* The diary paper */}
      <div className="diary-paper mb-6">
        <div className="p-8 md:p-10 font-serif text-gray-700">
          {/* Text content */}
          {star.content && (
            <div className="whitespace-pre-wrap leading-8 text-[15px] mb-6">
              {star.content}
            </div>
          )}

          {/* Memories (text) */}
          {star.memories?.filter(m => m.content && !m.voiceUrl).map((mem, i) => (
            <div key={mem.id} className="mb-4 last:mb-0">
              <p className="leading-8 text-[15px]">{mem.content}</p>
              <p className="text-xs text-gray-300 mt-1">
                {format(parseISO(mem.createdAt), 'HH:mm')}
              </p>
            </div>
          ))}

          {/* Voice memories */}
          {star.memories?.filter(m => m.voiceUrl).map((mem) => {
            const fullUrl = mem.voiceUrl?.startsWith('http')
              ? mem.voiceUrl
              : `http://localhost:3001${mem.voiceUrl}`;
            return (
              <div key={mem.id} className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl mb-3 last:mb-0">
                <button
                  onClick={() => playVoice(fullUrl)}
                  className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-gray-100 transition-all"
                >
                  {playingVoice === fullUrl
                    ? <Square className="w-4 h-4 text-primary" />
                    : <Play className="w-4 h-4 text-primary ml-0.5" />}
                </button>
                <div className="flex-1">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-32">
                    <div className={`h-full bg-primary rounded-full transition-all ${playingVoice === fullUrl ? 'animate-progress' : 'w-0'}`} />
                  </div>
                </div>
                <Music className="w-4 h-4 text-gray-300" />
                {mem.content && <span className="text-xs text-gray-400">{mem.content}</span>}
              </div>
            );
          })}

          {/* Empty state */}
          {!hasContent && (
            <div className="text-center py-10 text-gray-300">
              <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">这一天还没有记录</p>
            </div>
          )}
        </div>
      </div>

      {/* Photo Gallery */}
      {star.photos && star.photos.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <ImageIcon className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">照片 ({star.photos.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {star.photos.map((photo) => {
              const fullUrl = photo.url.startsWith('http') ? photo.url : `http://localhost:3001${photo.url}`;
              return (
                <motion.div
                  key={photo.id}
                  layoutId={`photo-${photo.id}`}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all"
                  onClick={() => setExpandedPhoto(fullUrl)}
                >
                  <img src={fullUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {expandedPhoto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <motion.img
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            src={expandedPhoto}
            alt=""
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}

      {/* Color accent bar */}
      <div className="h-1 rounded-full mx-auto" style={{
        width: '80px',
        backgroundColor: star.color || '#FFD700',
        opacity: 0.4,
      }} />

      <style jsx>{`
        .diary-paper {
          background: #fffdf9;
          border-radius: 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          border: 1px solid #f0e8e0;
          background-image:
            linear-gradient(#f0ece4 1px, transparent 1px);
          background-size: 100% 32px;
          position: relative;
        }
        .diary-paper::before {
          content: '';
          position: absolute;
          left: 44px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(212, 168, 168, 0.12);
        }
        @media (max-width: 640px) {
          .diary-paper { padding: 0; }
          .diary-paper::before { left: 32px; }
        }
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress 30s linear;
        }
      `}</style>
    </motion.div>
  );
}
