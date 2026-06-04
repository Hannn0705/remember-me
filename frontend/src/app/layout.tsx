import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Remember Me - 为爱而生的记忆星球',
  description: '用星星记录每一天的美好回忆，与你的另一半分享爱与感动',
  keywords: ['恋人', '电子礼物', '记忆', '星星', '情书'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
