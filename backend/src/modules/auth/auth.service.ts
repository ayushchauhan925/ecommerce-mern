import { authRepository } from './auth.repository';
import { hashPassword, comparePassword } from '../../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} from '../../utils/jwt';
import { AppError } from '../../middleware/error.middleware';
import { AuthTokens, LoginInput, RegisterInput, SafeUser } from './auth.types';
import { emailQueue } from '../../jobs/queue';

function toSafeUser(user: { id: string; name: string; email: string; role: string }): SafeUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function issueTokens(userId: string, role: string): Promise<AuthTokens> {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = signRefreshToken({ userId });

  await authRepository.createRefreshToken({
    token: refreshToken,
    userId,
    expiresAt: getRefreshTokenExpiryDate(),
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    const tokens = await issueTokens(user.id, user.role);

    // Enqueue only — we await the (fast) Redis write that records the job,
    // not the job's actual execution. The welcome email is sent later by
    // email.worker.ts, off the request/response cycle.
    await emailQueue.add('welcome-email', {
      type: 'welcome',
      to: user.email,
      name: user.name,
    });

    return { user: toSafeUser(user), tokens };
  },

  async login(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const tokens = await issueTokens(user.id, user.role);
    return { user: toSafeUser(user), tokens };
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const stored = await authRepository.findRefreshToken(refreshToken);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError('Refresh token is no longer valid', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await authRepository.findUserById(payload.userId);
    if (!user) {
      throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND');
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    return { accessToken };
  },

  async logout(refreshToken: string): Promise<void> {
    const stored = await authRepository.findRefreshToken(refreshToken);
    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(refreshToken);
    }
    // Idempotent: logging out an already-revoked/unknown token is not an error
  },
};