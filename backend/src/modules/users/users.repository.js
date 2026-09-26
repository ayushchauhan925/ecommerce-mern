const { prisma } = require('../../config/database');

const usersRepository = {
  findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  updateProfile(id, data) {
    return prisma.user.update({ where: { id }, data });
  },

  updateRole(id, role) {
    return prisma.user.update({ where: { id }, data: { role } });
  },

  async findMany(page, limit) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);
    return { users, total };
  },
};

module.exports = { usersRepository };
