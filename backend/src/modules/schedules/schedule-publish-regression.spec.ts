import { SchedulesService } from './schedules.service';

describe('SchedulesService.publish — safe notification & workflow isolation regression', () => {
  const orgId = 'org-hospital-1';
  const adminUser = {
    accountId: 'admin-acct-1',
    organizationId: orgId,
    roles: ['hospital_training_admin'],
  } as any;

  function createMockPublishEnvironment({
    traineeHasUserAccount = true,
  }: {
    traineeHasUserAccount?: boolean;
  }) {
    const createdShifts: any[] = [];
    const createdRevisions: any[] = [];
    const updatedSchedules: any[] = [];
    const createdNotifications: any[] = [];

    const mockSchedule = {
      id: 'sched-100',
      organizationId: orgId,
      titleAr: 'جدول التدريب العام',
      status: 'draft',
      sessions: [
        {
          id: 'sess-1',
          date: new Date('2026-09-01'),
          startTime: '08:00',
          endTime: '12:00',
          departmentId: 'dept-1',
          trainerProfileId: 'trainer-1',
          traineeProfileId: 'trainee-1',
          shiftType: 'morning',
          sessionType: 'clinical_round',
        },
      ],
      participants: [
        {
          traineeProfileId: 'trainee-1',
          traineeProfile: {
            id: 'trainee-1',
            personId: 'person-1',
          },
        },
      ],
      revisions: [],
    };

    const tx = {
      trainingSchedule: {
        findFirst: jest.fn().mockResolvedValue(mockSchedule),
        update: jest.fn().mockImplementation(async (args) => {
          updatedSchedules.push(args);
          return { ...mockSchedule, ...args.data };
        }),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (args) => {
          createdShifts.push(args.data);
          return { id: 'shift-' + (createdShifts.length + 1), ...args.data };
        }),
      },
      scheduleRevision: {
        create: jest.fn().mockImplementation(async (args) => {
          createdRevisions.push(args.data);
          return { id: 'rev-1', ...args.data };
        }),
      },
      userAccount: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.personId === 'person-1' && traineeHasUserAccount) {
            return { id: 'user-trainee-1' };
          }
          return null;
        }),
      },
      notification: {
        create: jest.fn().mockImplementation(async (args) => {
          createdNotifications.push(args.data);
          return { id: 'notif-1', ...args.data };
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as any;

    const conflictEngine = {
      validateSessions: jest.fn().mockResolvedValue({ hasConflict: false, conflicts: [] }),
    } as any;

    const service = new SchedulesService(prisma, conflictEngine);

    return {
      service,
      tx,
      createdShifts,
      createdRevisions,
      updatedSchedules,
      createdNotifications,
    };
  }

  it('A. Trainee has UserAccount -> Publish succeeds and notification is generated', async () => {
    const { service, createdShifts, createdRevisions, updatedSchedules, createdNotifications, tx } =
      createMockPublishEnvironment({ traineeHasUserAccount: true });

    const result = await service.publish('sched-100', adminUser, 'اعتماد رسمي');

    expect(result).toEqual({ success: true, revision: 1 });
    expect(createdShifts).toHaveLength(1);
    expect(createdRevisions).toHaveLength(1);
    expect(updatedSchedules[0].data.status).toBe('published');
    expect(tx.userAccount.findFirst).toHaveBeenCalledWith({
      where: { personId: 'person-1' },
      select: { id: true },
    });
    expect(createdNotifications).toHaveLength(1);
    expect(createdNotifications[0].userId).toBe('user-trainee-1');
  });

  it('B. Trainee does NOT have UserAccount -> Publish succeeds and notification is skipped without rollback', async () => {
    const { service, createdShifts, createdRevisions, updatedSchedules, createdNotifications } =
      createMockPublishEnvironment({ traineeHasUserAccount: false });

    const result = await service.publish('sched-100', adminUser);

    expect(result).toEqual({ success: true, revision: 1 });
    expect(createdShifts).toHaveLength(1);
    expect(createdRevisions).toHaveLength(1);
    expect(updatedSchedules[0].data.status).toBe('published');
    expect(createdNotifications).toHaveLength(0);
  });
});
