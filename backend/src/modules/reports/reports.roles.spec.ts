import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards';
import { ROLES_KEY } from '../../common/decorators';

/**
 * `hospital_administrator` holds REPORT_VIEW in capabilities.ts, but
 * ReportsController gates on role name via RolesGuard, not on capabilities —
 * and REPORT_READ_ROLES did not list the role, so the capability it was
 * granted was unreachable. The fix adds it to REPORT_READ_ROLES only; nothing
 * about RolesGuard, capabilities.ts, or any other role's list changes.
 *
 * These tests exercise RolesGuard directly against the real metadata declared
 * on ReportsController's handlers — the same mechanism the live route uses —
 * rather than re-implementing the role list here.
 */
describe('ReportsController role gate — REPORT_READ_ROLES', () => {
  function canActivate(requiredRoles: string[], userRoles: string[]): boolean {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { accountId: 'acct-1', roles: userRoles }, url: '/reports/definitions', method: 'GET' }),
      }),
    } as any;
    return guard.canActivate(context);
  }

  // The exact metadata ReportsController.findAllDefinitions declares via
  // @RequireRoles(...REPORT_READ_ROLES), imported live rather than hard-coded,
  // so this test breaks if the controller's decorator ever drifts from it.
  let REPORT_READ_ROLES: readonly string[];
  beforeAll(async () => {
    const mod = await import('./reports.controller');
    const Reflect_ = require('@nestjs/core');
    void mod;
    // Pull the metadata straight off the decorated method — the same value
    // Nest's own Reflector would read at request time.
    const { ReportsController } = mod as any;
    REPORT_READ_ROLES = Reflect.getMetadata(ROLES_KEY, ReportsController.prototype.findAllDefinitions);
  });

  it('grants hospital_administrator access to GET /reports/definitions', () => {
    expect(REPORT_READ_ROLES).toContain('hospital_administrator');
    expect(canActivate([...REPORT_READ_ROLES], ['hospital_administrator'])).toBe(true);
  });

  it('still refuses trainer', () => {
    expect(REPORT_READ_ROLES).not.toContain('trainer');
    expect(() => canActivate([...REPORT_READ_ROLES], ['trainer'])).toThrow(ForbiddenException);
  });

  it('still refuses trainee', () => {
    expect(REPORT_READ_ROLES).not.toContain('trainee');
    expect(() => canActivate([...REPORT_READ_ROLES], ['trainee'])).toThrow(ForbiddenException);
  });

  it('leaves hospital_training_admin behaviour unchanged (already allowed, still allowed)', () => {
    expect(REPORT_READ_ROLES).toContain('hospital_training_admin');
    expect(canActivate([...REPORT_READ_ROLES], ['hospital_training_admin'])).toBe(true);
  });

  it('leaves cluster_manager behaviour unchanged (already allowed, still allowed)', () => {
    expect(REPORT_READ_ROLES).toContain('cluster_manager');
    expect(canActivate([...REPORT_READ_ROLES], ['cluster_manager'])).toBe(true);
  });

  it('rejects when no user is attached to the request', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['hospital_administrator']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
    } as any;
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
