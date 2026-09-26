import { comparePassword, hashPassword } from '../../../src/utils/password';

describe('password utils', () => {
  it('hashes a password and verifies it round-trip', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).not.toBe('correct horse battery staple');
    expect(hash).toMatch(/^\$2[aby]\$10\$/); // bcrypt, cost factor 10
    await expect(comparePassword('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    await expect(comparePassword('Correct horse battery staple', hash)).resolves.toBe(false);
    await expect(comparePassword('', hash)).resolves.toBe(false);
  });

  it('salts every hash, so the same password never produces the same hash twice', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);

    expect(a).not.toBe(b);
    await expect(comparePassword('same-password', a)).resolves.toBe(true);
    await expect(comparePassword('same-password', b)).resolves.toBe(true);
  });
});
