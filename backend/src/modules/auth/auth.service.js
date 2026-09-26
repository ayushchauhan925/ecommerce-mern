const { authRepository } = require('./auth.repository');
const { hashPassword, comparePassword } = require('../../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} = require('../../utils/jwt');
const { AppError } = require('../../middleware/error.middleware');
const { emailQueue } = require('../../jobs/queue');

function toSafeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function issueTokens(userId, role) {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = signRefreshToken({ userId });

  await authRepository.createRefreshToken({
    token: refreshToken,
    userId,
    expiresAt: getRefreshTokenExpiryDate(),
  });

  return { accessToken, refreshToken };
}

const authService = {
  async register(input) {
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
    // email.worker.js, off the request/response cycle.
    await emailQueue.add('welcome-email', {
      type: 'welcome',
      to: user.email,
      name: user.name,
    });

    return { user: toSafeUser(user), tokens };
  },

  async login(input) {
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

  async refresh(refreshToken) {
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

  async logout(refreshToken) {
    const stored = await authRepository.findRefreshToken(refreshToken);
    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(refreshToken);
    }
    // Idempotent: logging out an already-revoked/unknown token is not an error
  },
};

module.exports = { authService };
