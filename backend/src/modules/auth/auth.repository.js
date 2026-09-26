const { prisma } = require('../../config/database');

const authRepository = {
  findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  createUser(data) {
    return prisma.user.create({ data });
  },

  createRefreshToken(data) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(token) {
    return prisma.refreshToken.findUnique({ where: { token } });
  },

  revokeRefreshToken(token) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  },
};

module.exports = { authRepository };
