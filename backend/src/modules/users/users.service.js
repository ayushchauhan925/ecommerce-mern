const { usersRepository } = require('./users.repository');
const { AppError } = require('../../middleware/error.middleware');

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

const usersService = {
  async getProfile(userId) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return toSafeUser(user);
  },

  async updateProfile(userId, input) {
    const user = await usersRepository.updateProfile(userId, { name: input.name });
    return toSafeUser(user);
  },

  async getUserById(id) {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return toSafeUser(user);
  },

  async updateUserRole(id, role) {
    const existing = await usersRepository.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const user = await usersRepository.updateRole(id, role);
    return toSafeUser(user);
  },

  async listUsers(page, limit) {
    const { users, total } = await usersRepository.findMany(page, limit);
    return {
      users: users.map(toSafeUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
};

module.exports = { usersService };
