# 🌟 Remember Me

> 为爱而生的记忆星球 — 送给恋人的电子礼物 💝

<div align="center">

[![GitHub stars](https://img.shields.io/badge/GitHub-Hannn0705/remember-me-ff69b4?style=flat&logo=github)](https://github.com/Hannn0705/remember-me)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red?style=flat&logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat&logo=prisma)](https://prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

一款高保真复刻的恋人电子礼物网页应用，源于小红书上的创意灵感。
支持**星点记忆、双人连接、定时情书、共同小精灵、记忆册**等功能。

---

## 🎬 在线演示

> **🌐 GitHub 仓库:** [https://github.com/Hannn0705/remember-me](https://github.com/Hannn0705/remember-me)
>
> **🚀 Vercel 部署:** [https://remember-me-eta.vercel.app](https://remember-me-eta.vercel.app) (前端)
>
> **🐳 Docker 部署:** 详见下方部署说明

---

## 📸 版本导览

| 版本 | 功能 | 位置 |
|------|------|------|
| **v1** | ⭐ 星点记忆 · 💌 情书 · 🔗 伴侣连接 | `/dashboard`, `/letters`, `/partner` |
| **v2** | 🎨 奶油梦境风格 HTML 版 | `remember-me-v2.html` |
| **v3** | 🐱 共同小精灵（喂食/玩耍/清洁/录音/升级） | `/pet/v3` |
| **v4** | 📖 双人记忆册（散落拼贴/录音/图片/心情） | `/memory/v4` |

---

## ✨ 功能特性

### 🎯 核心功能

| 功能 | 描述 |
|------|------|
| **⭐ 星点记忆** | 每天都是一颗星，记录文字、照片、语音，构建专属星空 |
| **📖 记忆册** (v4) | 双人回忆散落拼贴，支持实时录音、图片上传、心情选择 |
| **🔗 双人连接** | 通过邀请码连接伴侣，合并时间线，共享每一刻感动 |
| **💌 定时情书** | 写下此刻的心情，定时发送给最爱的人，制造惊喜 |
| **🐱 共同小精灵** (v3) | 多人共同养宠物，喂食、玩耍、清洁、录音互动、自动升级 |
| **📅 时间线** | 查看两个人的完整记忆时间线，回顾美好时光 |

### 🎨 视觉风格
- v1-v3 紫色渐变现代风
- v2 独立奶油梦境 HTML 版（`#D4A8A8` / `#FDF8F4`）
- v4 记忆册暖色调拼贴风格

### 🔐 用户系统
- 邮箱注册 + 密码登录
- JWT 认证 + Refresh Token
- 密码强度校验
- 找回密码功能

### 📧 邮件系统
- 注册欢迎邮件
- 验证码发送
- 密码找回
- 情书送达通知

### 👑 后台管理
- Dashboard 数据统计
- 用户管理（搜索、禁用、删除）
- 邮件日志与模板管理
- 系统配置管理

---

## 🛠️ 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| Next.js 15 | React 框架 (App Router) |
| TypeScript | 类型安全 |
| TailwindCSS + Framer Motion | 样式 + 动画 |
| Lucide React | 图标库 |
| Recharts | 数据图表 |
| Sonner | 消息通知 |
| Web MediaRecorder API | 语音录制 |

### 后端
| 技术 | 用途 |
|------|------|
| NestJS 10 | Node.js 后端框架 |
| TypeScript | 类型安全 |
| PostgreSQL / SQLite | 数据库 |
| Prisma ORM | 数据库 ORM |
| JWT + Passport | 身份认证 |
| Nodemailer | 邮件发送 |
| Swagger | API 文档 |

### DevOps
| 技术 | 用途 |
|------|------|
| Docker + Docker Compose | 容器化部署 |
| Nginx | 反向代理 |
| PM2 | 进程管理 |

---

## 📁 项目结构

```
remember-me/
├── frontend/                 # Next.js 前端
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # 首页
│       │   ├── login/             # 登录
│       │   ├── register/          # 注册
│       │   ├── dashboard/         # v1 星点记忆
│       │   ├── diary/             # 日记本
│       │   ├── letters/           # v1 情书系统
│       │   ├── memory/v4/         # v4 记忆册
│       │   ├── pet/v3/            # v3 共同小精灵
│       │   ├── partner/           # v1 伴侣连接
│       │   ├── settings/          # 个人设置
│       │   └── admin/             # 后台管理
│       ├── components/diary/      # 日记组件
│       └── lib/                   # API + Auth
├── backend/                  # NestJS 后端
│   ├── prisma/               # 数据模型 + 种子
│   └── src/
│       ├── auth/             # 认证模块
│       ├── user/             # 用户模块
│       ├── memory/           # 记忆/星星模块
│       ├── partner/          # 伴侣模块
│       ├── letter/           # 情书模块
│       ├── email/            # 邮件模块
│       ├── cron/             # 定时任务模块
│       ├── pet/              # v3 宠物模块
│       └── admin/            # 管理模块
├── docker/                   # Docker + Nginx + 部署脚本
├── remember-me-v2.html       # v2 奶油梦境独立版
└── docker-compose.yml        # Docker 编排
```

---

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/Hannn0705/remember-me.git
cd remember-me

# 2. 配置环境变量
cp .env.example .env.production
# 编辑 .env.production 填入你的配置

# 3. 启动所有服务
docker-compose up -d

# 4. 访问
open http://localhost:3000
```

### 方式二：手动开发

#### 环境要求
- Node.js 20+
- PostgreSQL / SQLite（开发默认 SQLite）

#### 后端启动

```bash
cd backend
npm install
cp .env.example .env  # SQLite 无需额外配置
npx prisma db push
npx prisma db seed
npm run start:dev
```

#### 前端启动

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
npm run dev
```

### 🌐 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:3001/api |
| API 文档 | http://localhost:3001/api/docs |

### 👤 默认账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@remember-me.app | Admin@123456 |
| 演示用户 | demo@remember-me.app | User@123456 |

---

## 🚢 Vercel 部署（前端）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Hannn0705/remember-me)

1. Fork 或导入 GitHub 仓库到 Vercel
2. 设定 Root Directory 为 `frontend`
3. 添加环境变量: `NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api`
4. 部署即可

> 后端需部署在支持 Node.js 的服务器（VPS / Railway / Render 等）

---

## 🔧 API 概览

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/profile` | 获取用户信息 |
| POST | `/api/auth/send-code` | 发送验证码 |
| POST | `/api/auth/reset-password` | 重置密码 |

### 记忆 (v1/v4)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/memories/stars` | 获取月份星星 |
| POST | `/api/memories/stars` | 创建星星 |
| GET | `/api/memories/stars/:id` | 获取星星详情 |
| POST | `/api/memories/stars/:id/memories` | 添加记忆 |
| POST | `/api/memories/stars/:id/photos` | 上传照片 |
| GET | `/api/memories/timeline` | 获取时间线 |

### 情书 (v1)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/letters` | 创建情书 |
| GET | `/api/letters/inbox` | 收件箱 |
| GET | `/api/letters/outbox` | 发件箱 |

### 小精灵 (v3)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/pet/create` | 创建宠物 |
| GET | `/api/pet/:id` | 宠物详情 |
| POST | `/api/pet/:id/feed` | 喂食 |
| POST | `/api/pet/:id/play` | 玩耍 |
| POST | `/api/pet/:id/voice/upload` | 上传语音 |
| GET | `/api/pet/:id/voices` | 语音列表 |

---

## 🐳 Docker 生产部署

```bash
# 执行部署脚本
bash docker/deploy.sh
```

### Ubuntu 服务器部署

```bash
# 初始化环境（首次）
bash docker/setup-ubuntu.sh

# 部署
cd /var/www/remember-me
docker-compose up -d
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with 💝 · <a href="https://github.com/Hannn0705/remember-me">GitHub</a>
</p>
