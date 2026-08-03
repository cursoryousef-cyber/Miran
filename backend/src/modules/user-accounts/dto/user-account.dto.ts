import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserAccountDto {
  @ApiProperty({ description: 'معرف الشخص (Person ID) المرتبط' })
  @IsUUID('4', { message: 'معرف الشخص غير صالح' })
  @IsNotEmpty({ message: 'معرف الشخص مطلوب' })
  personId!: string;

  @ApiProperty({ description: 'البريد الإلكتروني للحساب' })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @IsNotEmpty({ message: 'البريد الإلكتروني مطلوب' })
  email!: string;

  @ApiPropertyOptional({ description: 'اسم المستخدم (اختياري)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'كلمة المرور (إذا تم تعيينها مباشرة)' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  password?: string;

  @ApiProperty({ description: 'معرف الجهة التابع لها الحساب' })
  @IsUUID('4', { message: 'معرف الجهة غير صالح' })
  @IsNotEmpty({ message: 'معرف الجهة مطلوب' })
  organizationId!: string;

  @ApiPropertyOptional({ description: 'رمز الدور المطلوب تعيينه للمستخدم في هذه الجهة' })
  @IsOptional()
  @IsString()
  roleCode?: string;
}

export class AddUserToOrgDto {
  @ApiProperty({ description: 'معرف الجهة' })
  @IsUUID('4', { message: 'معرف الجهة غير صالح' })
  @IsNotEmpty({ message: 'معرف الجهة مطلوب' })
  organizationId!: string;

  @ApiPropertyOptional({ description: 'رمز الدور في هذه الجهة' })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({ description: 'هل هي الجهة الرئيسية للمستخدم؟' })
  @IsOptional()
  isPrimary?: boolean;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'معرف حساب المستخدم' })
  @IsUUID('4')
  @IsNotEmpty()
  userAccountId!: string;

  @ApiProperty({ description: 'معرف الجهة' })
  @IsUUID('4')
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({ description: 'معرف الدور' })
  @IsUUID('4')
  @IsNotEmpty()
  roleId!: string;
}
