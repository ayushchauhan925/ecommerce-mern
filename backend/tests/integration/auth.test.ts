import { prisma } from '../../src/config/database';
import { emailQueue } from '../../src/jobs/queue';
import { api, createUser, DEFAULT_PASSWORD } from '../helpers/factories';

const newUser = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Password123!' };

async function registerAndLogin() {
  await api().post('/api/auth/register').send(newUser).expect(201);
  const res = await api()
    .post('/api/auth/login')
    .send({ email: newUser.email, password: newUser.password })
    .expect(200);
  return res.body.data.tokens as { accessToken: string; refreshToken: string };
}

describe('POST /api/auth/register', () => {
  it('creates the user, returns tokens, and never exposes the password hash', async () => {
    const res = await api().post('/api/auth/register').send(newUser).expect(201);

    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'CUSTOMER',
    });
    expect(res.body.data.tokens).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'ada@example.com' } });
    expect(stored.passwordHash).not.toBe(newUser.password);
  });

  it('enqueues a welcome email instead of sending it inline', async () => {
    await api().post('/api/auth/register').send(newUser).expect(201);

    expect(emailQueue.add).toHaveBeenCalledWith('welcome-email', {
      type: 'welcome',
      to: 'ada@example.com',
      name: 'Ada Lovelace',
    });
  });

  it('rejects a duplicate email, case-insensitively', async () => {
    await api().post('/api/auth/register').send(newUser).expect(201);

    const res = await api()
      .post('/api/auth/register')
      .send({ ...newUser, email: 'ADA@Example.com' })
      .expect(409);

    expect(res.body.errorCode).toBe('EMAIL_ALREADY_EXISTS');
    expect(await prisma.user.count()).toBe(1);
  });

  it('rejects an invalid body with 400', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newUser, password: 'short' })
      .expect(400);

    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(await prisma.user.count()).toBe(0);
  });
});

describe('POST /api/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const { user } = await createUser({ email: 'grace@example.com' });

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: DEFAULT_PASSWORD })
      .expect(200);

    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1);
  });

  it('rejects a wrong password', async () => {
    await createUser({ email: 'grace@example.com' });

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: 'WrongPassword!' })
      .expect(401);

    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  it('gives an unknown email the exact same response (no account enumeration)', async () => {
    await createUser({ email: 'grace@example.com' });

    const wrongPassword = await api()
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: 'WrongPassword!' });
    const unknownEmail = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword!' });

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new access token that works on a protected route', async () => {
    const { refreshToken } = await registerAndLogin();

    const res = await api().post('/api/auth/refresh').send({ refreshToken }).expect(200);
    const { accessToken } = res.body.data;

    const me = await api()
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.data.email).toBe(newUser.email);
  });

  it('rejects a malformed refresh token', async () => {
    const res = await api().post('/api/auth/refresh').send({ refreshToken: 'garbage' }).expect(401);

    expect(res.body.errorCode).toBe('INVALID_REFRESH_TOKEN');
  });

  it('rejects an access token passed as a refresh token', async () => {
    const { accessToken } = await registerAndLogin();

    await api().post('/api/auth/refresh').send({ refreshToken: accessToken }).expect(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token, so refreshing afterwards is rejected', async () => {
    const { refreshToken } = await registerAndLogin();

    await api().post('/api/auth/logout').send({ refreshToken }).expect(200);

    const stored = await prisma.refreshToken.findUniqueOrThrow({ where: { token: refreshToken } });
    expect(stored.revokedAt).not.toBeNull();

    // The JWT itself is still cryptographically valid and unexpired — only
    // the server-side revocation record makes this fail.
    const res = await api().post('/api/auth/refresh').send({ refreshToken }).expect(401);
    expect(res.body.errorCode).toBe('INVALID_REFRESH_TOKEN');
  });

  it('only revokes the session being logged out', async () => {
    const sessionA = await registerAndLogin();
    const sessionB = (
      await api()
        .post('/api/auth/login')
        .send({ email: newUser.email, password: newUser.password })
        .expect(200)
    ).body.data.tokens;

    await api().post('/api/auth/logout').send({ refreshToken: sessionA.refreshToken }).expect(200);

    await api().post('/api/auth/refresh').send({ refreshToken: sessionB.refreshToken }).expect(200);
  });

  it('is idempotent', async () => {
    const { refreshToken } = await registerAndLogin();

    await api().post('/api/auth/logout').send({ refreshToken }).expect(200);
    await api().post('/api/auth/logout').send({ refreshToken }).expect(200);
  });
});
