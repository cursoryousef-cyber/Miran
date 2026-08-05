import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsArray } from 'class-validator';

export class CreateTrainingRequestDto {
  @ApiProperty({ description: 'معرف الجهة الهدف (التجمع الصحي)' })
  @IsUUID('4')
  @IsNotEmpty()
  targetOrgId!: string;

  @ApiPropertyOptional({ description: 'معرف البرنامج الأكاديمي' })
  @IsOptional()
  @IsUUID('4')
  programId?: string;

  @ApiPropertyOptional({ description: 'معرف الدفعة الأكاديمية' })
  @IsOptional()
  @IsUUID('4')
  academicIntakeId?: string;

  @ApiProperty({ description: 'عدد متدربي الامتياز المطلوبين' })
  @IsNumber()
  @IsNotEmpty()
  studentCount!: number;

  @ApiPropertyOptional({ description: 'درجة الأولوية (normal, high, urgent)' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'ملاحظات الجامعة' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTrainingRequestDto {
  @ApiPropertyOptional({ description: 'حالة الطلب (submitted, reviewed, approved, allocated, rejected)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'ملاحظات مدير التجمع' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'قائمة مستشفيات التوزيع والمقاعد' })
  @IsOptional()
  @IsArray()
  allocations?: any[];
}
