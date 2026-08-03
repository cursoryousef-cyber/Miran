import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum OrgLifecycleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export class CreateOrganizationDto {
  @ApiProperty({ description: 'معرف نوع الجهة (OrganizationType ID)' })
  @IsUUID('4', { message: 'معرف نوع الجهة غير صالح' })
  @IsNotEmpty({ message: 'نوع الجهة مطلوب' })
  organizationTypeId!: string;

  @ApiPropertyOptional({ description: 'معرف الجهة الأم (في الشجرة التنظيمية)' })
  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  @ApiProperty({ description: 'رمز الجهة الفريد (مثال: NB-CLUSTER, HOSP-01)' })
  @IsString()
  @IsNotEmpty({ message: 'رمز الجهة مطلوب' })
  code!: string;

  @ApiProperty({ description: 'اسم الجهة بالعربية' })
  @IsString()
  @IsNotEmpty({ message: 'اسم الجهة بالعربية مطلوب' })
  nameAr!: string;

  @ApiProperty({ description: 'اسم الجهة بالإنجليزية' })
  @IsString()
  @IsNotEmpty({ message: 'اسم الجهة بالإنجليزية مطلوب' })
  nameEn!: string;

  @ApiPropertyOptional({ description: 'حالة دورت الحياة', enum: OrgLifecycleStatus })
  @IsOptional()
  @IsEnum(OrgLifecycleStatus)
  status?: OrgLifecycleStatus;

  @ApiPropertyOptional({ description: 'المدينة بالعربية' })
  @IsOptional()
  @IsString()
  cityAr?: string;

  @ApiPropertyOptional({ description: 'المدينة بالإنجليزية' })
  @IsOptional()
  @IsString()
  cityEn?: string;

  @ApiPropertyOptional({ description: 'المنطقة بالعربية' })
  @IsOptional()
  @IsString()
  regionAr?: string;

  @ApiPropertyOptional({ description: 'المنطقة بالإنجليزية' })
  @IsOptional()
  @IsString()
  regionEn?: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني للجهة' })
  @IsOptional()
  @IsEmail({}, { message: 'البريد غير صالح' })
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'هاتف التواصل' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class UpdateOrganizationDto extends CreateOrganizationDto {}

export class ProvisionOrgWizardDto {
  @ApiProperty({ description: 'بيانات الجهة المراد إنشاؤها' })
  organization!: CreateOrganizationDto;

  @ApiProperty({ description: 'الاسم الكامل لمدير الجهة الجديد' })
  @IsString()
  @IsNotEmpty({ message: 'اسم مدير الجهة مطلوب' })
  adminNameAr!: string;

  @ApiProperty({ description: 'البريد الإلكتروني لمدير الجهة' })
  @IsEmail({}, { message: 'البريد غير صالح' })
  @IsNotEmpty({ message: 'بريد مدير الجهة مطلوب' })
  adminEmail!: string;

  @ApiPropertyOptional({ description: 'الهوية الوطنية لمدير الجهة' })
  @IsOptional()
  @IsString()
  adminNationalId?: string;

  @ApiPropertyOptional({ description: 'جوال مدير الجهة' })
  @IsOptional()
  @IsString()
  adminPhone?: string;
}
