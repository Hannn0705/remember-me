'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Star, PenLine, Users, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (!mounted) return null;

  const features = [
    {
      icon: Star,
      title: '星点记忆',
      desc: '每一天都是一颗星，记录属于你们的点点滴滴',
      color: 'text-yellow-500',
      bg: 'bg-yellow-50',
    },
    {
      icon: Users,
      title: '双人连接',
      desc: '两个人的时间线在此交汇，共同编织爱的星河',
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      icon: PenLine,
      title: '定时情书',
      desc: '写下此刻的心情，让未来的某一天收到惊喜',
      color: 'text-pink-500',
      bg: 'bg-pink-50',
    },
    {
      icon: Sparkles,
      title: '心动瞬间',
      desc: '每一个微小的感动，都值得被永远珍藏',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            <span className="text-xl font-serif font-bold gradient-text">Remember Me</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-full hover:shadow-lg transition-all hover:scale-105"
            >
              开始使用
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-purple-50 text-primary px-4 py-2 rounded-full text-sm mb-6">
              <Heart className="w-4 h-4" />
              <span>送给恋人的电子礼物</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">Remember Me</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-4 font-serif">
              为爱而生的记忆星球
            </p>
            <p className="text-gray-500 mb-8 max-w-xl mx-auto">
              用星星记录每一天，让爱意在时空中流转
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-full text-lg font-medium hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
              >
                开始记录 <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-full text-lg font-medium hover:border-primary hover:text-primary transition-all"
              >
                我已有账号
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            用<span className="gradient-text">星星</span>的方式说爱你
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            每一种表达爱的方式，都在这里找到了属于它的星辰
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">如何开始</h2>
          <div className="space-y-12">
            {[
              { step: '01', title: '注册账号', desc: '创建你的专属记忆星球' },
              { step: '02', title: '记录每一天', desc: '在星点网格中记录文字、照片和语音' },
              { step: '03', title: '连接另一半', desc: '通过专属邀请码与伴侣连接，合并时间线' },
              { step: '04', title: '定时写信', desc: '写下情书，定时发送给最爱的人' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-6"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-gray-500">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold gradient-text">Remember Me</span>
          </div>
          <p className="text-gray-400 text-sm">为爱而生的记忆星球 | Made with 💝</p>
        </div>
      </footer>
    </div>
  );
}
