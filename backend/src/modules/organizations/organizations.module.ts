import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationHierarchyService } from './organization-hierarchy.service';
import { OrganizationProvisioningService } from './organization-provisioning.service';
import { OrganizationAffiliationsService } from './organization-affiliations.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationAffiliationsController } from './organization-affiliations.controller';

@Module({
  controllers: [OrganizationsController, OrganizationAffiliationsController],
  providers: [
    OrganizationsService,
    OrganizationHierarchyService,
    OrganizationProvisioningService,
    OrganizationAffiliationsService,
  ],
  exports: [
    OrganizationsService,
    OrganizationHierarchyService,
    OrganizationProvisioningService,
    OrganizationAffiliationsService,
  ],
})
export class OrganizationsModule {}
