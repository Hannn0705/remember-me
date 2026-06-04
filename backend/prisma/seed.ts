import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@remember-me.app' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@remember-me.app',
      passwordHash: adminPassword,
      nickname: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
      partnerCode: 'ADMIN2024',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create demo user
  const userPassword = await bcrypt.hash('User@123456', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@remember-me.app' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'demo@remember-me.app',
      passwordHash: userPassword,
      nickname: 'Demo用户',
      role: 'USER',
      emailVerified: true,
      isActive: true,
      partnerCode: 'DEMO2024',
    },
  });
  console.log(`✅ Demo user created: ${demoUser.email}`);

  // Create default email templates
  const templates = [
    {
      name: 'welcome',
      subject: '欢迎加入 Remember Me 🌟',
      htmlBody: `<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
        <h1 style="color: white; text-align: center; font-size: 28px;">欢迎来到 Remember Me</h1>
        <div style="background: white; border-radius: 12px; padding: 32px; margin: 24px 0;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">亲爱的 {{nickname}}，</p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">欢迎加入 Remember Me！在这里，你可以用星星记录每一天的美好回忆，与你的另一半分享爱与感动。</p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">现在就开始你的星点之旅吧 ✨</p>
        </div>
        <p style="color: rgba(255,255,255,0.8); text-align: center; font-size: 14px;">Remember Me - 为爱而生的记忆星球</p>
      </div>`,
      variables: JSON.stringify(['nickname']),
      isActive: true,
    },
    {
      name: 'verification_code',
      subject: '您的验证码 - Remember Me',
      htmlBody: `<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
        <h1 style="color: white; text-align: center; font-size: 24px;">验证码</h1>
        <div style="background: white; border-radius: 12px; padding: 32px; margin: 24px 0; text-align: center;">
          <p style="color: #333; font-size: 16px;">您的验证码是：</p>
          <div style="background: #f3f0ff; border-radius: 8px; padding: 16px 32px; margin: 16px 0; display: inline-block;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea;">{{code}}</span>
          </div>
          <p style="color: #999; font-size: 14px;">验证码有效期为10分钟</p>
        </div>
        <p style="color: rgba(255,255,255,0.8); text-align: center; font-size: 14px;">如果这不是您本人的操作，请忽略此邮件</p>
      </div>`,
      variables: JSON.stringify(['code']),
      isActive: true,
    },
    {
      name: 'password_reset',
      subject: '重置密码 - Remember Me',
      htmlBody: `<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
        <h1 style="color: white; text-align: center; font-size: 24px;">重置密码</h1>
        <div style="background: white; border-radius: 12px; padding: 32px; margin: 24px 0;">
          <p style="color: #333; font-size: 16px;">您好，</p>
          <p style="color: #333; font-size: 16px;">您请求了重置密码，请使用以下验证码：</p>
          <div style="background: #f3f0ff; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea;">{{code}}</span>
          </div>
          <p style="color: #999; font-size: 14px;">验证码有效期为10分钟</p>
        </div>
      </div>`,
      variables: JSON.stringify(['code']),
      isActive: true,
    },
    {
      name: 'letter_notification',
      subject: '您收到了一封情书 💌 - Remember Me',
      htmlBody: `<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 16px;">
        <h1 style="color: white; text-align: center; font-size: 24px;">💌 您收到了一封情书</h1>
        <div style="background: white; border-radius: 12px; padding: 32px; margin: 24px 0;">
          <p style="color: #333; font-size: 16px;">亲爱的 {{nickname}}，</p>
          <p style="color: #333; font-size: 16px;">{{sender}} 给您写了一封情书，快来 Remember Me 查看吧！</p>
          <p style="color: #666; font-size: 14px; font-style: italic;">"{{preview}}"</p>
        </div>
        <p style="color: rgba(255,255,255,0.8); text-align: center; font-size: 14px;">Remember Me - 传递爱与思念</p>
      </div>`,
      variables: JSON.stringify(['nickname', 'sender', 'preview']),
      isActive: true,
    },
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
  }
  console.log(`✅ Email templates created: ${templates.length}`);

  // Create default system configs
  const configs = [
    { key: 'site_name', value: JSON.stringify('Remember Me') },
    { key: 'site_logo', value: JSON.stringify('') },
    { key: 'site_description', value: JSON.stringify('为爱而生的记忆星球') },
    { key: 'allow_registration', value: JSON.stringify('true') },
    { key: 'smtp_config', value: JSON.stringify({}) },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log(`✅ System configs created: ${configs.length}`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
