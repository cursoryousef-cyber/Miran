import { TrainingRequestTraineesService } from './training-request-trainees.service';

/**
 * BD-11 regression: trainee login after promotion.
 *
 * promoteToTrainee must create an OrganizationAssignment with a membership
 * source type and the trainee role. Without it, AuthService.login's
 * resolveOrgContext falls through to the UserOrganization legacy path, which
 * breaks as soon as any other assignment row exists for the user. These unit
 * tests drive the private method through the service's public approveTrainee
 * and verify the OrganizationAssignment is written alongside UserRole and
 * UserOrganization.
 */
describe('BD-11 — trainee provisioning creates OrganizationAssignment', () => {
  const TARGET_ORG = 'org-hospital-1';
  const TRAINEE_ROLE_ID = 'role-trainee-uuid';
  const ACCOUNT_ID = 'account-new-trainee';
  const PERSON_ID = 'person-new-trainee';
  const PROFILE_ID = 'profile-new-trainee';
  const ROW_ID = 'trt-row-1';

  function makePrisma() {
    const store = {
      orgAssignments: [] as any[],
      userOrgs: [] as any[],
      userRoles: [] as any[],
    };

    const prisma = {
      trainingRequestTrainee: {
        findUnique: jest.fn().mockResolvedValue({
          id: ROW_ID,
          trainingRequestId: 'tr-1',
          nationalId: '1234567890',
          nameAr: 'متدرب جديد',
          nameEn: 'New Trainee',
          academicNumber: 'AC-001',
          email: 'trainee@test.local',
          mobile: '0500000000',
          gender: 'male',
          specialty: 'surgery',
          universityOrgId: 'org-uni-1',
          status: 'submitted',
          validationErrors: [],
          assignedHospitalId: null,
          startDate: new Date(),
          endDate: new Date(),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      trainingRequest: {
        findUnique: jest.fn().mockResolvedValue({
          targetOrgId: TARGET_ORG,
          academicIntakeId: null,
          programId: null,
        }),
      },
      person: {
        upsert: jest.fn().mockResolvedValue({ id: PERSON_ID }),
      },
      userAccount: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: ACCOUNT_ID }),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: TRAINEE_ROLE_ID, code: 'trainee' }),
      },
      userRole: {
        upsert: jest.fn().mockImplementation(({ create }) => {
          store.userRoles.push(create);
          return Promise.resolve(create);
        }),
      },
      userOrganization: {
        upsert: jest.fn().mockImplementation(({ create }) => {
          store.userOrgs.push(create);
          return Promise.resolve(create);
        }),
      },
      organizationAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation((args) => {
          store.orgAssignments.push(args.data);
          return Promise.resolve({ id: 'oa-new', ...args.data });
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      traineeProfile: {
        upsert: jest.fn().mockResolvedValue({ id: PROFILE_ID }),
      },
      document: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (fn: Function) => fn(prisma)),
    } as any;

    // Second findUnique after create returns the new account
    prisma.userAccount.findUnique.mockImplementation(({ where }: any) => {
      if (where?.email === 'trainee@test.local') {
        return Promise.resolve({ id: ACCOUNT_ID, personId: PERSON_ID, email: 'trainee@test.local' });
      }
      return Promise.resolve(null);
    });

    return { prisma, store };
  }

  function makeService(prisma: any) {
    const notificationService = {
      create: jest.fn().mockResolvedValue({}),
      notifyOrgUsers: jest.fn().mockResolvedValue({}),
    };
    const validationEngine = { validateTrainees: jest.fn().mockResolvedValue([]) };
    const capacityService = {
      runGuarded: jest.fn().mockImplementation((fn: Function) => fn()),
    };
    const scopeContext = {} as any;
    const allocationService = {} as any;

    return new TrainingRequestTraineesService(
      prisma,
      notificationService as any,
      validationEngine as any,
      capacityService as any,
      scopeContext,
      allocationService,
    );
  }

  const actor = {
    accountId: 'actor-1',
    personId: 'actor-person',
    organizationId: TARGET_ORG,
    email: 'actor@test.local',
    roles: ['cluster_administrator'],
  } as any;

  it('creates OrganizationAssignment with trainee role and membership source', async () => {
    const { prisma, store } = makePrisma();
    const service = makeService(prisma);

    await service.approveTrainee(ROW_ID, actor);

    // Must have created an OrganizationAssignment
    expect(store.orgAssignments.length).toBeGreaterThanOrEqual(1);
    const assignment = store.orgAssignments.find(
      (a: any) => a.organizationId === TARGET_ORG && a.userAccountId === ACCOUNT_ID,
    );
    expect(assignment).toBeDefined();
    expect(assignment.roleId).toBe(TRAINEE_ROLE_ID);
    expect(assignment.isPrimary).toBe(true);
    expect(assignment.isActive).toBe(true);
    // sourceType must be a MEMBERSHIP_SOURCE so resolveOrgContext finds it
    expect(['user_organization', 'user_role', 'manual']).toContain(assignment.sourceType);
  });

  it('does not duplicate assignment when one already exists', async () => {
    const { prisma, store } = makePrisma();
    // Pre-existing assignment
    prisma.organizationAssignment.findFirst.mockResolvedValue({
      id: 'oa-existing',
      userAccountId: ACCOUNT_ID,
      organizationId: TARGET_ORG,
      roleId: TRAINEE_ROLE_ID,
      sourceType: 'user_organization',
    });

    const service = makeService(prisma);
    await service.approveTrainee(ROW_ID, actor);

    // Should not have created a new one
    expect(prisma.organizationAssignment.create).not.toHaveBeenCalled();
    expect(store.orgAssignments.length).toBe(0);
  });

  it('patches roleId on existing roleless assignment', async () => {
    const { prisma } = makePrisma();
    // Pre-existing assignment without role
    prisma.organizationAssignment.findFirst.mockResolvedValue({
      id: 'oa-existing-no-role',
      userAccountId: ACCOUNT_ID,
      organizationId: TARGET_ORG,
      roleId: null,
      sourceType: 'user_organization',
    });

    const service = makeService(prisma);
    await service.approveTrainee(ROW_ID, actor);

    expect(prisma.organizationAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'oa-existing-no-role' },
        data: expect.objectContaining({ roleId: TRAINEE_ROLE_ID, isActive: true }),
      }),
    );
  });

  it('also creates UserRole and UserOrganization (regression)', async () => {
    const { prisma, store } = makePrisma();
    const service = makeService(prisma);

    await service.approveTrainee(ROW_ID, actor);

    // UserRole
    expect(store.userRoles.length).toBeGreaterThanOrEqual(1);
    expect(store.userRoles[0].organizationId).toBe(TARGET_ORG);
    expect(store.userRoles[0].roleId).toBe(TRAINEE_ROLE_ID);

    // UserOrganization
    expect(store.userOrgs.length).toBeGreaterThanOrEqual(1);
    expect(store.userOrgs[0].organizationId).toBe(TARGET_ORG);
    expect(store.userOrgs[0].isPrimary).toBe(true);
  });
});
