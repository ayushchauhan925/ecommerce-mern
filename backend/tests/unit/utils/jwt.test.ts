import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';
import {
  getRefreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../../src/utils/jwt';

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('JWT utils', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('access tokens', () => {
    it('signs and verifies a token, preserving the payload', () => {
      const token = signAccessToken({ userId: 'user-1', role: 'CUSTOMER' });

      expect(verifyAccessToken(token)).toMatchObject({ userId: 'user-1', role: 'CUSTOMER' });
    });

    it('rejects a token once its 15-minute lifetime has passed', () => {
      jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
      const token = signAccessToken({ userId: 'user-1', role: 'CUSTOMER' });

      jest.setSystemTime(new Date('2026-01-01T00:14:59Z'));
      expect(() => verifyAccessToken(token)).not.toThrow();

      jest.setSystemTime(new Date('2026-01-01T00:15:01Z'));
      expect(() => verifyAccessToken(token)).toThrow(jwt.TokenExpiredError);
    });

    it('rejects a token whose payload was tampered with (e.g. role escalation)', () => {
      const token = signAccessToken({ userId: 'user-1', role: 'CUSTOMER' });
      const [header, payload, signature] = token.split('.');
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());

      const forged = [header, base64url({ ...claims, role: 'ADMIN' }), signature].join('.');

      expect(() => verifyAccessToken(forged)).toThrow('invalid signature');
    });

    it('rejects a token signed with a different secret', () => {
      const token = jwt.sign({ userId: 'user-1', role: 'ADMIN' }, 'attacker-secret');

      expect(() => verifyAccessToken(token)).toThrow('invalid signature');
    });

    it('rejects an unsigned ("alg: none") token', () => {
      const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
        userId: 'user-1',
        role: 'ADMIN',
      })}.`;

      expect(() => verifyAccessToken(unsigned)).toThrow(jwt.JsonWebTokenError);
    });

    it('rejects garbage input', () => {
      expect(() => verifyAccessToken('not-a-jwt')).toThrow(jwt.JsonWebTokenError);
    });
  });

  describe('refresh tokens', () => {
    it('signs and verifies a token with a unique jti', () => {
      const a = verifyRefreshToken(signRefreshToken({ userId: 'user-1' }));
      const b = verifyRefreshToken(signRefreshToken({ userId: 'user-1' }));

      expect(a.userId).toBe('user-1');
      // Two logins in the same second must still get distinct tokens, since
      // refresh tokens are stored with a UNIQUE constraint.
      expect(a.jti).not.toBe(b.jti);
    });

    it('does not accept an access token as a refresh token, or vice versa', () => {
      const access = signAccessToken({ userId: 'user-1', role: 'CUSTOMER' });
      const refresh = signRefreshToken({ userId: 'user-1' });

      expect(() => verifyRefreshToken(access)).toThrow('invalid signature');
      expect(() => verifyAccessToken(refresh)).toThrow('invalid signature');
    });

    it('rejects a token past its 7-day lifetime', () => {
      jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
      const token = signRefreshToken({ userId: 'user-1' });

      jest.setSystemTime(new Date('2026-01-08T00:00:01Z'));
      expect(() => verifyRefreshToken(token)).toThrow(jwt.TokenExpiredError);
    });
  });

  describe('getRefreshTokenExpiryDate', () => {
    const originalExpiresIn = env.JWT_REFRESH_EXPIRES_IN;

    afterEach(() => {
      env.JWT_REFRESH_EXPIRES_IN = originalExpiresIn;
    });

    it('matches the configured refresh lifetime', () => {
      jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });

      expect(getRefreshTokenExpiryDate()).toEqual(new Date('2026-01-08T00:00:00Z'));
    });

    it.each([
      ['30s', 30 * 1000],
      ['45m', 45 * 60 * 1000],
      ['12h', 12 * 60 * 60 * 1000],
    ])('parses %s', (expiresIn, expectedMs) => {
      jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
      env.JWT_REFRESH_EXPIRES_IN = expiresIn;

      expect(getRefreshTokenExpiryDate().getTime() - Date.now()).toBe(expectedMs);
    });

    it('throws on a format it cannot parse', () => {
      env.JWT_REFRESH_EXPIRES_IN = '1 week';

      expect(() => getRefreshTokenExpiryDate()).toThrow('Invalid JWT_REFRESH_EXPIRES_IN');
    });
  });
});
