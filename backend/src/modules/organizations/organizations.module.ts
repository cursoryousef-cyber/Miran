import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationHierarchyService } from './organization-hierarchy.service';
import { OrganizationProvisioningService } from './organization-provisioning.service';
import { OrganizationAffiliationsService } from './organization-affiliations.service';
import { CapacityService } from './capacity.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationAffiliationsController } from './organization-affiliations.controller';

@Module({
  controllers: [OrganizationsController, OrganizationAffiliationsController],
  providers: [
    OrganizationsService,
    OrganizationHierarchyService,
    OrganizationProvisioningService,
    OrganizationAffiliationsService,
    CapacityService,
  ],
  exports: [
    OrganizationsService,
    OrganizationHierarchyService,
    OrganizationProvisioningService,
    OrganizationAffiliationsService,
    CapacityService,
  ],
})
export class OrganizationsModule {}
