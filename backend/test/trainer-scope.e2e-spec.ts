/**
 * Trainer scope and isolation.
 *
 * Proves the security boundary this pass adds: a plain trainer's view and
 * write actions are derived server-side from TraineeAllocation + active
 * Rotation, and cannot be widened by tampering with traineeId in the URL,
 * query, or body. Three trainers, three department/hospital combinations:
 *
 *   Trainer A (hospital1/h1Internal dept) → Trainee A, Trainee B
 *   Trainer B (hospital2/h2Internal dept) → Trainee C
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
  if (![200, 201].includes(res.status)) {
    throw new Error(`login ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.tokens.accessToken;
}

async function makeTrainee(opts: {
  nationalId: string; nameAr: string; email: string; organizationId: string; traineeNumber: string;
}) {
  const person = await prisma.person.create({
    data: { nationalId: opts.nationalId, nameAr: opts.nameAr, nameEn: opts.nameAr, dateOfBirth: new Date('1998-01-01'), gender: 'male', nationality: 'SA' },
  });
  const profile = await prisma.traineeProfile.create({
    data: { personId: person.id, organizationId: opts.organizationId, traineeNumber: opts.traineeNumber, level: 'intern', applicationStatus: 'active' },
  });
  const traineeRole = await prisma.role.findFirstOrThrow({ where: { code: 'trainee' } });
  const account = await prisma.userAccount.create({
    data: { personId: person.id, email: opts.email, passwordHash: await bcrypt.hash(SCENARIO.password, 10), isActive: true },
  });
  await prisma.userRole.create({ data: { userAccountId: account.id, roleId: traineeRole.id, organizationId: opts.organizationId } });
  await prisma.userOrganization.create({ data: { userAccountId: account.id, organizationId: opts.organizationId, isPrimary: true, isActive: true } });
  return { person, profile, account };
}

let traineeA: Awaited<ReturnType<typeof makeTrainee>>;
let traineeB: Awaited<ReturnType<typeof makeTrainee>>;
let traineeC: Awaited<ReturnType<typeof makeTrainee>>;
let traineeInactive: Awaited<ReturnType<typeof makeTrainee>>;
let trainerAToken: string;
let trainerBToken: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  http = request(app.getHttpServer());
  await resetE2EScenario();
  s = await seedE2EScenario();

  const start = new Date('2027-01-01');
  const end = new Date('2027-12-31');

  traineeA = await makeTrainee({ nationalId: '9920000001', nameAr: 'متدرب أ', email: 'scope_a@miran.test', organizationId: s.hospital1.id, traineeNumber: 'SCOPE-A' });
  traineeB = await makeTrainee({ nationalId: '9920000002', nameAr: 'متدرب ب', email: 'scope_b@miran.test', organizationId: s.hospital1.id, traineeNumber: 'SCOPE-B' });
  traineeC = await makeTrainee({ nationalId: '9920000003', nameAr: 'متدرب ج', email: 'scope_c@miran.test', organizationId: s.hospital2.id, traineeNumber: 'SCOPE-C' });
  traineeInactive = await makeTrainee({ nationalId: '9920000004', nameAr: 'متدرب غير نشط', email: 'scope_inactive@miran.test', organizationId: s.hospital1.id, traineeNumber: 'SCOPE-INACTIVE' });

  await prisma.rotation.create({ data: { traineeProfileId: traineeA.profile.id, organizationId: s.hospital1.id, departmentId: s.departments.h1Internal.id, trainerProfileId: s.trainers.h1Internal.id, startDate: start, endDate: end, status: 'active' } });
  await prisma.rotation.create({ data: { traineeProfileId: traineeB.profile.id, organizationId: s.hospital1.id, departmentId: s.departments.h1Internal.id, trainerProfileId: s.trainers.h1Internal.id, startDate: start, endDate: end, status: 'active' } });
  await prisma.rotation.create({ data: { traineeProfileId: traineeC.profile.id, organizationId: s.hospital2.id, departmentId: s.departments.h2Internal.id, trainerProfileId: s.trainers.h2Internal.id, startDate: start, endDate: end, status: 'active' } });
  // Same trainer/dept as A/B, but the rotation is completed — must be excluded from "assigned" scope.
  await prisma.rotation.create({ data: { traineeProfileId: traineeInactive.profile.id, organizationId: s.hospital1.id, departmentId: s.departments.h1Internal.id, trainerProfileId: s.trainers.h1Internal.id, startDate: start, endDate: end, status: 'completed' } });

  await prisma.attendance.create({ data: { organizationId: s.hospital1.id, traineeProfileId: traineeA.profile.id, date: new Date(new Date().toDateString()), checkIn: new Date(), status: 'present' } });

  trainerAToken = await login(SCENARIO.accounts.hospital1Trainer);
  trainerBToken = await login(SCENARIO.accounts.hospital2Trainer);
}, 120_000);

afterAll(async () => {
  await resetE2EScenario();
  await prisma.$disconnect();
  await app?.close();
});

describe('Trainer dashboard and assigned-interns scope', () => {
  it('trainer A sees exactly A and B, never C, and excludes the inactive rotation', async () => {
    const res = await http.get('/operations/trainer/assigned-interns').set(auth(trainerAToken));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids).toEqual(expect.arrayContaining([traineeA.profile.id, traineeB.profile.id]));
    expect(ids).not.toContain(traineeC.profile.id);
    expect(ids).not.toContain(traineeInactive.profile.id);
  });

  it('trainer B sees only C', async () => {
    const res = await http.get('/operations/trainer/assigned-interns').set(auth(trainerBToken));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids).toContain(traineeC.profile.id);
    expect(ids).not.toContain(traineeA.profile.id);
    expect(ids).not.toContain(traineeB.profile.id);
  });

  it('trainer A dashboard KPIs reflect only A/B, including attendance', async () => {
    const res = await http.get('/operations/trainer/dashboard').set(auth(trainerAToken));
    expect(res.status).toBe(200);
    expect(res.body.data.assignedTrainees).toBe(2);
    expect(res.body.data.presentToday).toBeGreaterThanOrEqual(1);
  });
});

describe('Trainee detail — scope enforced, not just filtered', () => {
  it('trainer A can open trainee A\'s detail', async () => {
    const res = await http.get(`/operations/trainer/trainee/${traineeA.profile.id}`).set(auth(trainerAToken));
    expect(res.status).toBe(200);
    expect(res.body.data.profile.id).toBe(traineeA.profile.id);
  });

  it('trainer A is rejected from trainee C\'s detail even with a valid, well-formed id', async () => {
    const res = await http.get(`/operations/trainer/trainee/${traineeC.profile.id}`).set(auth(trainerAToken));
    expect(res.status).toBe(400);
  });

  it('trainer A is rejected from the inactive-rotation trainee\'s detail', async () => {
    const res = await http.get(`/operations/trainer/trainee/${traineeInactive.profile.id}`).set(auth(trainerAToken));
    expect(res.status).toBe(400);
  });
});

describe('Task assignment scope', () => {
  it('trainer A can assign a task to trainee A', async () => {
    const res = await http.post('/operations/tasks').set(auth(trainerAToken)).send({ assignedToId: traineeA.account.id, titleAr: 'مهمة اختبار' });
    expect([200, 201]).toContain(res.status);
  });

  it('trainer A cannot assign a task to trainee C by tampering with assignedToId', async () => {
    const res = await http.post('/operations/tasks').set(auth(trainerAToken)).send({ assignedToId: traineeC.account.id, titleAr: 'مهمة متسللة' });
    expect(res.status).toBe(400);
  });
});

describe('Clinical logbook — approval, rejection and competency scope', () => {
  let logForA: { id: string };
  let logForC: { id: string };

  beforeAll(async () => {
    logForA = await prisma.clinicalCaseLog.create({
      data: { traineeProfileId: traineeA.profile.id, organizationId: s.hospital1.id, departmentId: s.departments.h1Internal.id, trainerProfileId: s.trainers.h1Internal.id, diagnosis: 'حالة أ', performedAt: new Date(), status: 'submitted' },
    });
    logForC = await prisma.clinicalCaseLog.create({
      data: { traineeProfileId: traineeC.profile.id, organizationId: s.hospital2.id, departmentId: s.departments.h2Internal.id, trainerProfileId: s.trainers.h2Internal.id, diagnosis: 'حالة ج', performedAt: new Date(), status: 'submitted' },
    });
  });

  it('my-logs for trainer A contains only A/B logs, not C\'s', async () => {
    const res = await http.get('/logbook/my-logs').set(auth(trainerAToken));
    const ids = res.body.data.map((l: any) => l.id);
    expect(ids).toContain(logForA.id);
    expect(ids).not.toContain(logForC.id);
  });

  it('trainer A cannot fetch trainee C\'s log history', async () => {
    const res = await http.get(`/logbook/trainee-logs/${traineeC.profile.id}`).set(auth(trainerAToken));
    expect(res.status).toBe(403);
  });

  it('trainer A can approve trainee A\'s log', async () => {
    const res = await http.post(`/logbook/entries/${logForA.id}/approve`).set(auth(trainerAToken)).send({});
    expect([200, 201]).toContain(res.status);
  });

  it('trainer A cannot approve trainee C\'s log', async () => {
    const res = await http.post(`/logbook/entries/${logForC.id}/approve`).set(auth(trainerAToken)).send({});
    expect(res.status).toBe(403);
  });

  it('rejecting without a reason is rejected', async () => {
    const res = await http.patch(`/logbook/entries/${logForA.id}/reject`).set(auth(trainerAToken)).send({});
    expect(res.status).toBe(400);
  });

  it('rejecting trainee C\'s log is refused regardless of reason', async () => {
    const res = await http.patch(`/logbook/entries/${logForC.id}/reject`).set(auth(trainerAToken)).send({ feedback: 'سبب واضح' });
    expect(res.status).toBe(403);
  });

  it('trainer A cannot read trainee C\'s competency progress by tampering with traineeId', async () => {
    const res = await http.get('/logbook/competencies').query({ traineeId: traineeC.profile.id }).set(auth(trainerAToken));
    expect(res.status).toBe(403);
  });
});

describe('Unauthorized access', () => {
  it('all trainer-scoped endpoints reject a request with no token', async () => {
    const endpoints = ['/operations/trainer/dashboard', '/operations/trainer/assigned-interns', `/operations/trainer/trainee/${traineeA.profile.id}`];
    for (const ep of endpoints) {
      const res = await http.get(ep);
      expect(res.status).toBe(401);
    }
  });
});
