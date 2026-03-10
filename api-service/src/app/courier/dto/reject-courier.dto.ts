import { IsNotEmpty, IsString } from 'class-validator';

export class RejectCourierDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;
}
