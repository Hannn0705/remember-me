import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePetDto {
  @ApiProperty({ example: '小火焰' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class PetActionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  amount?: number;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  inviteeId: string;
}

export class RespondInviteDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsString()
  @IsIn(['ACCEPTED', 'REJECTED'])
  status: string;
}

export class UploadVoiceDto {
  @ApiProperty()
  @IsInt()
  duration: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transcript?: string;
}
