import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './config/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MemoryModule } from './memory/memory.module';
import { PartnerModule } from './partner/partner.module';
import { LetterModule } from './letter/letter.module';
import { EmailModule } from './email/email.module';
import { CronModule } from './cron/cron.module';
import { AdminModule } from './admin/admin.module';
import { PetModule } from './pet/pet.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    // Schedule (cron jobs)
    ScheduleModule.forRoot(),
    // Custom modules
    ConfigModule,
    PrismaModule,
    AuthModule,
    UserModule,
    MemoryModule,
    PartnerModule,
    LetterModule,
    EmailModule,
    CronModule,
    AdminModule,
    PetModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
