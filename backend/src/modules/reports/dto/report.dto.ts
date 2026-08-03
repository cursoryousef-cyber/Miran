import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateReportDto {
  @ApiProperty({ description: 'معرف قالب التقرير (ReportDefinition ID)' })
  @IsUUID('4')
  @IsNotEmpty()
  reportDefinitionId!: string;

  @ApiPropertyOptional({ description: 'الصيغة (pdf, xlsx, csv)', default: 'pdf' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'بارامترات الفلترة' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
