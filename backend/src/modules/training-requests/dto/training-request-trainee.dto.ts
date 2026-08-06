import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** صف متدرب واحد كما يصل من ملف الإكسل أو الإدخال اليدوي */
export class TraineeRowDto {
  @ApiProperty({ description: 'الرقم الأكاديمي' })
  @IsString()
  @IsNotEmpty()
  academicNumber!: string;

  @ApiProperty({ description: 'رقم الهوية الوطنية' })
  @IsString()
  @IsNotEmpty()
  nationalId!: string;

  @ApiProperty({ description: 'الاسم بالعربية' })
  @IsString()
  @IsNotEmpty()
  nameAr!: string;

  @ApiPropertyOptional({ description: 'الاسم بالإنجليزية' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'الجنس (male / female)' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'معرف الجامعة' })
  @IsOptional()
  @IsUUID('4')
  universityOrgId?: string;

  @ApiPropertyOptional({ description: 'معرف الكلية' })
  @IsOptional()
  @IsUUID('4')
  collegeOrgId?: string;

  @ApiPropertyOptional({ description: 'برنامج الامتياز' })
  @IsOptional()
  @IsString()
  internshipProgram?: string;

  @ApiPropertyOptional({ description: 'رمز التخصص من جدول LookupTable' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ description: 'المعدل التراكمي' })
  @IsOptional()
  @IsNumber()
  gpa?: number;

  @ApiPropertyOptional({ description: 'رقم الجوال' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'فترة التدريب' })
  @IsOptional()
  @IsString()
  trainingPeriod?: string;

  @ApiPropertyOptional({ description: 'تاريخ البداية' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'تاريخ النهاية' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'الأولوية' })
  @IsOptional()
  @IsString()
  priority?: string;
}

export class ImportTraineesDto {
  @ApiProperty({ description: 'صفوف المتدربين', type: [TraineeRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TraineeRowDto)
  rows!: TraineeRowDto[];
}

export class UpdateTraineeRowDto extends TraineeRowDto {
  @ApiPropertyOptional({ description: 'ملاحظات داخلية للتجمع' })
  @IsOptional()
  @IsString()
  clusterInternalNotes?: string;

  @ApiPropertyOptional({ description: 'ملاحظات رسمية' })
  @IsOptional()
  @IsString()
  officialComments?: string;
}

export class ReturnTraineeDto {
  @ApiProperty({ description: 'سبب الإرجاع' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ description: 'ملاحظات رسمية إضافية' })
  @IsOptional()
  @IsString()
  officialComments?: string;

  @ApiPropertyOptional({ description: 'أنواع المستندات المطلوبة' })
  @IsOptional()
  @IsArray()
  requiredDocuments?: string[];

  @ApiPropertyOptional({ description: 'آخر موعد للتعديل' })
  @IsOptional()
  @IsDateString()
  correctionDeadline?: string;
}

export class RejectTraineeDto {
  @ApiProperty({ description: 'سبب الرفض' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class MergeTraineesDto {
  @ApiProperty({ description: 'معرفات الصفوف المكررة التي ستُدمج في الصف الأساسي' })
  @IsArray()
  @IsUUID('4', { each: true })
  duplicateRowIds!: string[];
}

export class SplitTraineeDto {
  @ApiProperty({ description: 'الصفوف الجديدة الناتجة عن التقسيم', type: [TraineeRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TraineeRowDto)
  rows!: TraineeRowDto[];
}
