/**
 * Hospital-scope isolation — the priority fixes from the scope audit.
 *
 * Each hospital is an independent training scope: Hospital A must never read
 * or write Hospital B's departments, trainers, trainees, requests,
 * allocations, rotations, attendance, logbook or evaluations. A cluster may
 * see/manage every hospital beneath it. Covers exactly the endpoints fixed
 * this pass — everything else (trainer-level isolation, trainee self-scope,
 * the allocation acceptance flow) is already covered by
 * trainer-scope.e2e-spec.ts and left untouched.
 *
 * Isolated test database only.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { SCENARIO, seedE2EScenario, resetE2EScenario } from '../src/seed/seed-e2e-scenario';

const prisma = new PrismaClient();
let app: INestApplication;
let http: ReturnType<typeof request>;
let s: Awaited<ReturnType<typeof seedE2EScenario>>;
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function login(email: string): Promise<string> {
  const res = await http.post('/auth/login').send({ email, password: SCENARIO.password });
  if (![200, 201].includes(res.status)) throw new Error(`login ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.tokens.accessToken;
}

let h1Token: string; // hospital1TrainingAdmin
let h2Token: string; // hospital2TrainingAdmin
let clusterToken: string; // sees both hospitals

let h2Rotation: { id: string; traineeProfileId: string };
let h2Attendance: { id: string };
let h2Task: { id: string };

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  http = request(app.getHttpServer());
  await resetE2EScenario();
  s = await seedE2EScenario();

  h1Token = await login(SCENARIO.accounts.hospital1TrainingAdmin);
  h2Token = await login(SCENARIO.accounts.hospital2TrainingAdmin);
  clusterToken = await login(SCENARIO.accounts.clusterTrainingDirector);

  const person = await prisma.person.create({
    data: { nationalId: '9950000001', nameAr: 'متدرب مستشفى 2', nameEn: 'Hospital 2 Trainee', dateOfBirth: new Date('1998-01-01'), gender: 'male', nationality: 'SA' },
  });
  const profile = await prisma.traineeProfile.create({
    data: { personId: person.id, organizationId: s.hospital2.id, traineeNumber: 'SCOPE-H2-1', level: 'intern', applicationStatus: 'active' },
  });
  const start = new Date('2027-01-01');
  const end = new Date('2027-12-31');
  const rotation = await prisma.rotation.create({
    data: { traineeProfileId: profile.id, organizationId: s.hospital2.id, departmentId: s.departments.h2Internal.id, trainerProfileId: s.trainers.h2Internal.id, startDate: start, endDate: end, status: 'active' },
  });
  h2Rotation = { id: rotation.id, traineeProfileId: profile.id };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attendance = await prisma.attendance.create({
    data: { organizationId: s.hospital2.id, traineeProfileId: profile.id, date: today, status: 'absent' },
  });
  h2Attendance = { id: attendance.id };

  const h2TrainingAdminAccount = await prisma.userAccount.findFirstOrThrow({ where: { email: SCENARIO.accounts.hospital2TrainingAdmin } });
  const task = await prisma.task.create({
    data: { organizationId: s.hospital2.id, assignedToId: h2TrainingAdminAccount.id, assignedById: h2TrainingAdminAccount.id, titleAr: 'مهمة اختبار العزل' },
  });
  h2Task = { id: task.id };
}, 120_000);

afterAll(async () => {
  // Not a trainee, so the shared reset's profile-driven cleanup never sees it.
  const orphan = await prisma.userAccount.findMany({ where: { email: { contains: 'scope_org_manager_h1_' } }, select: { id: true, personId: true } });
  const orphanIds = orphan.map((a) => a.id);
  if (orphanIds.length) {
    await prisma.userRole.deleteMany({ where: { userAccountId: { in: orphanIds } } });
    await prisma.userOrganization.deleteMany({ where: { userAccountId: { in: orphanIds } } });
    await prisma.userAccount.deleteMany({ where: { id: { in: orphanIds } } });
    await prisma.person.deleteMany({ where: { id: { in: orphan.map((a) => a.personId) } } });
  }
  await resetE2EScenario();
  await prisma.$disconnect();
  await app?.close();
});

describe('Trainees: GET /trainees/incoming', () => {
  it('hospital 1 sees only its own hospital\'s incoming trainees, never hospital 2\'s', async () => {
    const h1DirectorToken = await login(SCENARIO.accounts.hospital1Director);
    const res = await http.get('/trainees/incoming').set(auth(h1DirectorToken));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids).not.toContain(h2Rotation.traineeProfileId);
  });

  it('cluster sees both hospital 1 and hospital 2', async () => {
    const res = await http.get('/trainees/incoming').set(auth(clusterToken));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids).toContain(h2Rotation.traineeProfileId);
  });
});

describe('Organizations: GET /organizations, GET /organizations/:id', () => {
  it('hospital 1 does not see hospital 2 in the organizations list', async () => {
    const res = await http.get('/organizations').set(auth(h1Token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((o: any) => o.id);
    expect(ids).not.toContain(s.hospital2.id);
    expect(ids).toContain(s.hospital1.id);
  });

  it('hospital 1 is rejected reading hospital 2 by id, even with a well-formed id', async () => {
    const res = await http.get(`/organizations/${s.hospital2.id}`).set(auth(h1Token));
    expect(res.status).toBe(403);
  });

  it('cluster can read both hospitals by id', async () => {
    const r1 = await http.get(`/organizations/${s.hospital1.id}`).set(auth(clusterToken));
    const r2 = await http.get(`/organizations/${s.hospital2.id}`).set(auth(clusterToken));
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
  });
});

describe('Training requests: hospital-review queue + row actions', () => {
  it('hospitalId query param cannot be used to read another hospital\'s review queue', async () => {
    const res = await http.get('/training-requests/hospital-review').query({ hospitalId: s.hospital2.id }).set(auth(h1Token));
    expect(res.status).toBe(403);
  });

  it('cluster may pick either hospital\'s review queue explicitly', async () => {
    const res = await http.get('/training-requests/hospital-review').query({ hospitalId: s.hospital2.id }).set(auth(clusterToken));
    expect(res.status).toBe(200);
  });
});

describe('Trainer management: workspace-cards / qualified / qualifications / replacements / leave', () => {
  it('workspace-cards rejects a client-supplied organizationId belonging to another hospital', async () => {
    const res = await http.get('/trainers/workspace-cards').query({ organizationId: s.hospital2.id }).set(auth(h1Token));
    expect(res.status).toBe(403);
  });

  it('qualified rejects a client-supplied organizationId belonging to another hospital', async () => {
    const res = await http.get('/trainers/qualified').query({ organizationId: s.hospital2.id, programId: s.program.id }).set(auth(h1Token));
    expect(res.status).toBe(403);
  });

  it('hospital 1 cannot read hospital 2 trainer\'s qualifications by id', async () => {
    const res = await http.get(`/trainers/${s.trainers.h2Internal.id}/qualifications`).set(auth(h1Token));
    expect(res.status).toBe(403);
  });

  it('hospital 1 cannot get replacement suggestions for a hospital 2 trainer', async () => {
    const res = await http.get(`/trainers/${s.trainers.h2Internal.id}/suggest-replacements`).set(auth(h1Token));
    expect(res.status).toBe(403);
  });

  it('hospital 1 cannot approve a hospital 2 trainer leave', async () => {
    const leave = await prisma.trainerLeave.create({
      data: { trainerProfileId: s.trainers.h2Internal.id, organizationId: s.hospital2.id, leaveType: 'annual_leave', startDate: new Date('2027-02-01'), endDate: new Date('2027-02-05'), status: 'pending' },
    });
    const res = await http.patch(`/trainers/leaves/${leave.id}/approve`).set(auth(h1Token));
    expect(res.status).toBe(403);
    const res2 = await http.patch(`/trainers/leaves/${leave.id}/cancel`).set(auth(h1Token));
    expect(res2.status).toBe(403);
  });
});

describe('Allocations: POST /trainers/reassign', () => {
  it('hospital 1 cannot reassign a hospital 2 rotation to a hospital 2 trainer', async () => {
    const res = await http.post('/trainers/reassign').set(auth(h1Token)).send({
      traineeProfileId: h2Rotation.traineeProfileId,
      rotationId: h2Rotation.id,
      newTrainerId: s.trainers.h2Internal.id,
      reason: 'transfer',
    });
    expect(res.status).toBe(403);
  });
});

describe('Attendance: approve / reject / correction-request', () => {
  it('hospital 1 cannot approve or reject hospital 2\'s attendance record', async () => {
    const h1TrainerToken = await login(SCENARIO.accounts.hospital1Trainer);
    const approve = await http.patch(`/operations/attendance/${h2Attendance.id}/approve`).set(auth(h1TrainerToken));
    expect([400, 403]).toContain(approve.status);
    const reject = await http.patch(`/operations/attendance/${h2Attendance.id}/reject`).set(auth(h1TrainerToken)).send({ reason: 'x' });
    expect([400, 403]).toContain(reject.status);
  });
});

describe('Tasks: PATCH /operations/tasks/:id/complete', () => {
  it('an account cannot complete a task assigned to someone else', async () => {
    const h1TrainerToken = await login(SCENARIO.accounts.hospital1Trainer);
    const res = await http.patch(`/operations/tasks/${h2Task.id}/complete`).set(auth(h1TrainerToken));
    expect(res.status).toBe(400);
  });
});

describe('Evaluations: midpoint endpoints', () => {
  it('hospital 1 cannot read or complete a hospital 2 rotation\'s midpoint meeting', async () => {
    const h1TrainerToken = await login(SCENARIO.accounts.hospital1Trainer);
    const status = await http.get(`/operations/evaluations/midpoint/${h2Rotation.id}`).set(auth(h1TrainerToken));
    expect(status.status).toBe(403);
    const complete = await http.patch(`/operations/evaluations/midpoint/${h2Rotation.id}/complete`).set(auth(h1TrainerToken)).send({});
    expect(complete.status).toBe(403);
  });
});

describe('Logbook / Competencies: assertTrainerScope no longer bypasses supervisory roles', () => {
  let h2Log: { id: string };

  beforeAll(async () => {
    h2Log = await prisma.clinicalCaseLog.create({
      data: { traineeProfileId: h2Rotation.traineeProfileId, organizationId: s.hospital2.id, departmentId: s.departments.h2Internal.id, trainerProfileId: s.trainers.h2Internal.id, diagnosis: 'حالة عزل', performedAt: new Date(), status: 'submitted' },
    });
  });

  it('hospital_training_admin at hospital 1 cannot read hospital 2\'s trainee logs (previously bypassed entirely)', async () => {
    const res = await http.get(`/logbook/trainee-logs/${h2Rotation.traineeProfileId}`).set(auth(h1Token));
    expect(res.status).toBe(403);
  });

  it('hospital_training_admin at hospital 1 cannot approve a hospital 2 clinical log', async () => {
    const res = await http.post(`/logbook/entries/${h2Log.id}/approve`).set(auth(h1Token)).send({});
    expect(res.status).toBe(403);
  });

  it('hospital_training_admin at hospital 1 cannot read hospital 2\'s competency progress via traineeId', async () => {
    const res = await http.get('/logbook/competencies').query({ traineeId: h2Rotation.traineeProfileId }).set(auth(h1Token));
    expect(res.status).toBe(403);
  });

  it('cluster (visible over both hospitals) CAN read hospital 2\'s trainee logs', async () => {
    const res = await http.get(`/logbook/trainee-logs/${h2Rotation.traineeProfileId}`).set(auth(clusterToken));
    expect(res.status).toBe(200);
  });
});

describe('Org members: PATCH /:id', () => {
  it('a hospital 1 admin cannot edit a hospital 2 staff member by account id', async () => {
    const h1DirectorToken = await login(SCENARIO.accounts.hospital1Director);
    const h2Account = await prisma.userAccount.findFirstOrThrow({ where: { email: SCENARIO.accounts.hospital2TrainingAdmin } });
    const res = await http.patch(`/org-members/${h2Account.id}`).set(auth(h1DirectorToken)).send({ nameAr: 'اسم متسلل' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('هذا الحساب ليس عضواً في جهتك');

    const untouched = await prisma.person.findFirst({ where: { userAccounts: { some: { id: h2Account.id } } } });
    expect(untouched?.nameAr).not.toBe('اسم متسلل');
  });
});

describe('Legacy training-request acceptance chain: scoped to the request\'s actual hospital(s)', () => {
  let requestId: string;

  beforeAll(async () => {
    const req = await prisma.trainingRequest.create({
      data: {
        requestNumber: `SCOPE-TEST-${Date.now()}`,
        sourceOrgId: s.university.id,
        targetOrgId: s.cluster.id,
        specialty: 'internal_medicine',
        trainingStartDate: new Date('2027-01-01'),
        trainingEndDate: new Date('2027-12-31'),
        studentCount: 1,
        status: 'hospital_review',
      },
    });
    requestId = req.id;
    await prisma.trainingRequestTrainee.create({
      data: {
        trainingRequestId: requestId,
        academicNumber: 'SCOPE-CHAIN-1',
        nationalId: '9960000001',
        nameAr: 'متدرب سلسلة القبول',
        assignedHospitalId: s.hospital2.id,
        status: 'hospital_review',
      },
    });
  });

  it('hospital 1 cannot act on a request whose only assigned hospital is hospital 2', async () => {
    const endpoints: [string, string][] = [
      [`/training-requests/${requestId}/accept-hospital-director`, 'hospital1Director'],
      [`/training-requests/${requestId}/accept-supervisor`, 'hospital1Trainer'],
      [`/training-requests/${requestId}/accept-trainer`, 'hospital1Trainer'],
      [`/training-requests/${requestId}/accept`, 'hospital1TrainingAdmin'],
      [`/training-requests/${requestId}/return-to-cluster`, 'hospital1TrainingAdmin'],
      [`/training-requests/${requestId}/reject`, 'hospital1TrainingAdmin'],
    ];
    for (const [path, accountKey] of endpoints) {
      const token = await login((SCENARIO.accounts as any)[accountKey]);
      const res = await http.post(path).set(auth(token)).send({ notes: 'x', reason: 'x' });
      expect(res.status).toBe(403);
    }
  });

  it('hospital 2\'s own training admin is not scope-blocked from its own correctly-assigned request', async () => {
    const h2Token = await login(SCENARIO.accounts.hospital2TrainingAdmin);
    const res = await http.post(`/training-requests/${requestId}/accept`).set(auth(h2Token)).send({ notes: 'x' });
    expect(res.status).not.toBe(403);
  });
});

describe('Organization write routes: PATCH/DELETE /organizations/:id', () => {
  it('hospital roles do not hold manage_organizations — the write side stays unreachable, unaffected by adding @ScopedResource', async () => {
    const h1DirectorToken = await login(SCENARIO.accounts.hospital1Director);
    const res = await http.patch(`/organizations/${s.hospital2.id}`).set(auth(h1DirectorToken)).send({ nameAr: 'اسم متسلل' });
    expect(res.status).toBe(403);
  });

  it('an org_manager scoped to hospital 1 cannot update or delete hospital 2\'s organization record', async () => {
    // No org_manager fixture exists in the shared scenario; a minimal one is
    // created directly, scoped to hospital 1, purely to exercise the
    // @ScopedResource('organization','id') path manage_organizations holders
    // actually reach (hospital_administrator, tested above, is blocked one
    // guard earlier and never reaches it).
    const role = await prisma.role.findFirstOrThrow({ where: { code: 'org_manager' } });
    const stamp = Date.now().toString().slice(-8);
    const person = await prisma.person.create({
      data: { nationalId: `997${stamp}`, nameAr: 'مدير جهة مستشفى 1', nameEn: 'Org Manager H1', dateOfBirth: new Date('1990-01-01'), gender: 'male', nationality: 'SA' },
    });
    const account = await prisma.userAccount.create({
      data: { personId: person.id, email: `scope_org_manager_h1_${stamp}@miran.test`, passwordHash: await bcrypt.hash(SCENARIO.password, 10), isActive: true },
    });
    await prisma.userRole.create({ data: { userAccountId: account.id, roleId: role.id, organizationId: s.hospital1.id } });
    await prisma.userOrganization.create({ data: { userAccountId: account.id, organizationId: s.hospital1.id, isPrimary: true, isActive: true } });

    const token = await login(`scope_org_manager_h1_${stamp}@miran.test`);
    const patchRes = await http.patch(`/organizations/${s.hospital2.id}`).set(auth(token)).send({ nameAr: 'اسم متسلل' });
    expect(patchRes.status).toBe(403);
    const deleteRes = await http.delete(`/organizations/${s.hospital2.id}`).set(auth(token));
    expect(deleteRes.status).toBe(403);

    const untouched = await prisma.organization.findUniqueOrThrow({ where: { id: s.hospital2.id } });
    expect(untouched.nameAr).not.toBe('اسم متسلل');
    expect(untouched.deletedAt).toBeNull();

    // Same account is not scope-blocked from updating its own hospital — status
    // depends on unrelated DTO validation, not on @ScopedResource.
    const ownRes = await http.patch(`/organizations/${s.hospital1.id}`).set(auth(token)).send({ nameAr: s.hospital1.nameAr });
    expect(ownRes.status).not.toBe(403);
  });
});
