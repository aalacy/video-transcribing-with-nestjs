import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UploadDto {
  @ApiPropertyOptional()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  visitorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  width: number;

  @ApiPropertyOptional()
  @IsOptional()
  height: number;
}
