import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { EmailModule } from '../email/email.module';
import { LetterModule } from '../letter/letter.module';
import { PetModule } from '../pet/pet.module';

@Module({
  imports: [EmailModule, LetterModule, PetModule],
  controllers: [CronController],
  providers: [CronService],
})
export class CronModule {}
