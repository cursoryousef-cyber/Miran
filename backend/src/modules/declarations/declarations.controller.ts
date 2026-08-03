import { Controller, Get, Post, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { DeclarationsService } from './declarations.service';
import { CreateDeclarationDto, AcceptDeclarationDto } from './dto/declaration.dto';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Declarations & Compliance (الإقرارات والتعهدات الوطنية)')
@ApiBearerAuth('JWT-auth')
@ApiHeader({ name: 'X-Organization-Id', description: 'معرف الجهة' })
@UseGuards(JwtAuthGuard)
@Controller('declarations')
export class DeclarationsController {
  constructor(private readonly service: DeclarationsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء إقرار وتعهد جديد (الشؤون الأكاديمية)' })
  async create(
    @Headers('x-organization-id') orgId: string,
    @Body() dto: CreateDeclarationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.accountId || req.user?.sub || req.user?.id;
    return this.service.createDeclaration(orgId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'استرجاع كافة الإقرارات المتاحة للجهة' })
  async getByOrg(@Headers('x-organization-id') orgId: string) {
    return this.service.getDeclarationsByOrg(orgId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'استرجاع الإقرارات المطلوبة والمعلقة للمستخدم الحالي' })
  async getPending(
    @Headers('x-organization-id') orgId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.accountId || req.user?.sub || req.user?.id;
    return this.service.getPendingDeclarationsForUser(userId, orgId);
  }

  @Post('accept')
  @ApiOperation({ summary: 'الموافقة والتوقيع الرقمي على إقرار وتعهد' })
  async accept(
    @Headers('x-organization-id') orgId: string,
    @Body() dto: AcceptDeclarationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.accountId || req.user?.sub || req.user?.id;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    return this.service.acceptDeclaration(userId, orgId, dto, ip);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'استرجاع إحصائيات الموافقة ونسبة انضباط الإقرارات' })
  async getStatistics(@Headers('x-organization-id') orgId: string) {
    return this.service.getAcceptanceStatistics(orgId);
  }
}
