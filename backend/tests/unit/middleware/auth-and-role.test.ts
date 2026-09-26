import { NextFunction, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../../src/middleware/auth.middleware';
import { requireRole } from '../../../src/middleware/role.middleware';
import { AppError } from '../../../src/middleware/error.middleware';
import { signAccessToken } from '../../../src/utils/jwt';

const res = {} as Response;

function run(
  middleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void,
  req: Partial<AuthenticatedRequest>,
) {
  const next = jest.fn();
  middleware(req as AuthenticatedRequest, res, next);
  expect(next).toHaveBeenCalledTimes(1);
  return { error: next.mock.calls[0][0] as AppError | undefined, req };
}

describe('requireAuth', () => {
  it('attaches the user from a valid Bearer token', () => {
    const token = signAccessToken({ userId: 'user-1', role: 'ADMIN' });

    const { error, req } = run(requireAuth, { headers: { authorization: `Bearer ${token}` } });

    expect(error).toBeUndefined();
    expect(req.user).toEqual({ userId: 'user-1', role: 'ADMIN' });
  });

  it.each([
    ['no Authorization header', {}],
    ['a non-Bearer scheme', { authorization: 'Basic dXNlcjpwYXNz' }],
  ])('returns 401 UNAUTHORIZED for %s', (_label, headers) => {
    const { error } = run(requireAuth, { headers });

    expect(error).toMatchObject({ statusCode: 401, errorCode: 'UNAUTHORIZED' });
  });

  it('returns 401 INVALID_ACCESS_TOKEN for a bad token', () => {
    const { error, req } = run(requireAuth, { headers: { authorization: 'Bearer nope' } });

    expect(error).toMatchObject({ statusCode: 401, errorCode: 'INVALID_ACCESS_TOKEN' });
    expect(req.user).toBeUndefined();
  });
});

describe('requireRole', () => {
  it('lets an allowed role through', () => {
    const { error } = run(requireRole('ADMIN'), { user: { userId: 'u', role: 'ADMIN' } });
    expect(error).toBeUndefined();
  });

  it('returns 403 for a disallowed role', () => {
    const { error } = run(requireRole('ADMIN'), { user: { userId: 'u', role: 'CUSTOMER' } });
    expect(error).toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
  });

  it('returns 401 if requireAuth did not run first', () => {
    const { error } = run(requireRole('ADMIN'), {});
    expect(error).toMatchObject({ statusCode: 401 });
  });
});
