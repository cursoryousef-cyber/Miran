import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsArray, IsDateString } from 'class-validator';

export class CreateTrainingRequestDto {
  @ApiProperty({ description: 'معرف الجهة الهدف (التجمع الصحي)' })
  @IsUUID('4')
  @IsNotEmpty()
  targetOrgId!: string;

  @ApiPropertyOptional({ description: 'معرف البرنامج الأكاديمي' })
  @IsOptional()
  @IsUUID('4')
  programId?: string;

  @ApiPropertyOptional({ description: 'رمز التخصص من جدول التخصصات — تخصص الدفعة' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({
    description: 'قالب الخطة التدريبية المختار — يُثبَّت إصداره النشط وقت التقديم',
  })
  @IsOptional()
  @IsUUID('4')
  trainingPlanId?: string;

  @ApiPropertyOptional({
    description: 'إصدار خطة محدد — يُترك فارغاً ليُختار الإصدار النشط تلقائياً',
  })
  @IsOptional()
  @IsUUID('4')
  trainingPlanVersionId?: string;

  @ApiPropertyOptional({ description: 'تاريخ بداية التدريب' })
  @IsOptional()
  @IsDateString()
  trainingStartDate?: string;

  @ApiPropertyOptional({ description: 'تاريخ نهاية التدريب' })
  @IsOptional()
  @IsDateString()
  trainingEndDate?: string;

  @ApiPropertyOptional({ description: 'تاريخ التخرج المتوقع' })
  @IsOptional()
  @IsDateString()
  expectedGraduationDate?: string;

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

/**
 * Pre-submission check. Carries the same fields as creation minus the target
 * cluster, so the university can validate and preview a batch before committing.
 */
export class PreviewTrainingRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  programId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  trainingPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  trainingPlanVersionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  trainingStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  trainingEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedGraduationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  studentCount?: number;
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
