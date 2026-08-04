import { Module } from '@nestjs/common';
import { OrgMembersController } from './org-members.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrgMembersController],
})
export class OrgMembersModule {}
