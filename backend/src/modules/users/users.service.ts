import { usersRepository } from './users.repository';
import { AppError } from '../../middleware/error.middleware';
import { PaginatedUsers, SafeUser, UpdateProfileInput } from './users.types';

function toSafeUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export const usersService = {
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return toSafeUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<SafeUser> {
    const user = await usersRepository.updateProfile(userId, { name: input.name });
    return toSafeUser(user);
  },

  async getUserById(id: string): Promise<SafeUser> {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return toSafeUser(user);
  },

  async updateUserRole(id: string, role: 'CUSTOMER' | 'ADMIN'): Promise<SafeUser> {
    const existing = await usersRepository.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const user = await usersRepository.updateRole(id, role);
    return toSafeUser(user);
  },

  async listUsers(page: number, limit: number): Promise<PaginatedUsers> {
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