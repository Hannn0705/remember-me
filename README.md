# 🌟 Remember Me

> 为爱而生的记忆星球 - 送给恋人的电子礼物 💝

一款高保真复刻的恋人电子礼物网页应用，源于小红书上的创意灵感。支持星点记忆、双人连接、定时情书等功能。

## ✨ 功能特性

### 🎯 核心功能
| 功能 | 描述 |
|------|------|
| **⭐ 星点记忆** | 每天都是一颗星，记录文字、照片、语音，构建你们的专属星空 |
| **🔗 双人连接** | 通过邀请码连接伴侣，合并时间线，共享每一刻感动 |
| **💌 定时情书** | 写下此刻的心情，定时发送给最爱的人，制造惊喜 |
| **📅 时间线** | 查看两个人的完整记忆时间线，回顾美好时光 |

### 🔐 用户系统
- 邮箱注册 + 密码登录
- 邮箱验证码验证
- JWT 认证 + Refresh Token
- 密码强度校验
- 找回密码功能

### 📧 邮件系统
- 注册欢迎邮件
- 验证码发送
- 密码找回
- 情书送达通知
- 邮件模板管理

### 🔔 通知系统
- 伴侣请求通知
- 情书接收通知
- 实时状态更新

### 👑 后台管理
- Dashboard 数据统计
- 用户管理（搜索、禁用、删除）
- 邮件日志与模板管理
- 系统配置管理

## 🛠️ 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| Next.js 15 | React 框架 (App Router) |
| TypeScript | 类型安全 |
| TailwindCSS | 样式框架 |
| Framer Motion | 动画效果 |
| Lucide React | 图标库 |
| React Hook Form + Zod | 表单验证 |
| Recharts | 数据图表 |
| Sonner | 消息通知 |
| Axios | HTTP 客户端 |

### 后端
| 技术 | 用途 |
|------|------|
| NestJS | Node.js 后端框架 |
| TypeScript | 类型安全 |
| PostgreSQL | 主数据库 |
| Prisma ORM | 数据库 ORM |
| Redis | 缓存 / 消息队列 |
| BullMQ | 定时任务队列 |
| JWT | 身份认证 |
| Passport | 认证中间件 |
| Nodemailer | 邮件发送 |
| Swagger | API 文档 |

### DevOps
| 技术 | 用途 |
|------|------|
| Docker | 容器化 |
| Docker Compose | 编排 |
| Nginx | 反向代理 |
| PM2 | 进程管理 |

## 📁 项目结构

```
remember-me/
├── frontend/                 # Next.js 前端
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # 首页
│       │   ├── login/             # 登录
│       │   ├── register/          # 注册
│       │   ├── forgot-password/   # 找回密码
│       │   ├── dashboard/         # 星点记忆（主界面）
│       │   ├── letters/           # 情书系统
│       │   ├── partner/           # 伴侣连接
│       │   ├── settings/          # 个人设置
│       │   └── admin/             # 后台管理
│       ├── components/
│       │   └── layout/            # 布局组件
│       └── lib/                   # 工具库
├── backend/                  # NestJS 后端
│   ├── prisma/
│   │   ├── schema.prisma     # 数据模型
│   │   └── seed.ts           # 种子数据
│   └── src/
│       ├── auth/             # 认证模块
│       ├── user/             # 用户模块
│       ├── memory/           # 记忆/星星模块
│       ├── partner/          # 伴侣模块
│       ├── letter/           # 情书模块
│       ├── email/            # 邮件模块
│       ├── cron/             # 定时任务模块
│       ├── admin/            # 管理模块
│       └── common/           # 公共模块
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   ├── deploy.sh
│   └── setup-ubuntu.sh
├── docker-compose.yml
└── .env.example
```

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone <repo-url> remember-me
cd remember-me

# 2. 配置环境变量
cp .env.example .env.production
# 编辑 .env.production 填入你的配置

# 3. 启动所有服务
docker-compose up -d

# 4. 查看运行状态
docker-compose ps
```

### 方式二：手动开发

#### 环境要求
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

#### 后端启动

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp ../.env.example .env
# 编辑 .env 配置数据库连接

# 4. 初始化数据库
npx prisma migrate dev
npx prisma db seed

# 5. 启动开发服务器
npm run start:dev
```

#### 前端启动

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 编辑 .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local

# 4. 启动开发服务器
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

## 📦 部署

### Docker 生产部署

```bash
# 执行部署脚本
bash docker/deploy.sh
```

### Ubuntu 服务器部署

```bash
# 1. 运行环境初始化脚本（首次）
bash docker/setup-ubuntu.sh

# 2. 克隆代码并部署
cd /var/www/remember-me
docker-compose up -d
```

### PM2 部署（非 Docker）

```bash
# 构建前后端
cd backend && npm run build
cd ../frontend && npm run build

# 启动 PM2
pm2 start docker/pm2.ecosystem.config.js

# 配置 Nginx
# 参考 docker/nginx.conf
```

## 🔧 API 概览

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/refresh | 刷新令牌 |
| POST | /api/auth/send-code | 发送验证码 |
| POST | /api/auth/verify-code | 验证验证码 |
| POST | /api/auth/reset-password | 重置密码 |
| POST | /api/auth/change-password | 修改密码 |
| GET | /api/auth/profile | 获取用户信息 |

### 记忆
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/memories/stars | 获取月份星星 |
| POST | /api/memories/stars | 创建星星 |
| GET | /api/memories/stars/:id | 获取星星详情 |
| POST | /api/memories/stars/:id/memories | 添加记忆 |
| GET | /api/memories/timeline | 获取时间线 |

### 情书
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/letters | 创建情书 |
| GET | /api/letters/inbox | 收件箱 |
| GET | /api/letters/outbox | 发件箱 |
| PATCH | /api/letters/:id/read | 标记已读 |

### 伴侣
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/partners/request | 发送连接请求 |
| POST | /api/partners/accept/:id | 接受请求 |
| POST | /api/partners/disconnect | 解除连接 |

### 管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/dashboard | Dashboard 数据 |
| GET | /api/admin/users | 用户列表 |
| PATCH | /api/admin/users/:id/status | 修改用户状态 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

---

<p align="center">Made with 💝 for someone special</p>
