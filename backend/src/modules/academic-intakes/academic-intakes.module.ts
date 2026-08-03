import { Module } from '@nestjs/common';
import { AcademicIntakesService } from './academic-intakes.service';
import { AcademicIntakesController } from './academic-intakes.controller';

@Module({
  controllers: [AcademicIntakesController],
  providers: [AcademicIntakesService],
  exports: [AcademicIntakesService],
})
export class AcademicIntakesModule {}
