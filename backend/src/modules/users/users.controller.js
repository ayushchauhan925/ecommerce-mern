const { usersService } = require('./users.service');
const { sendSuccess } = require('../../utils/response');

const usersController = {
  async getMe(req, res, next) {
    try {
      const profile = await usersService.getProfile(req.user.userId);
      sendSuccess(res, profile, 'Profile fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req, res, next) {
    try {
      const profile = await usersService.updateProfile(req.user.userId, req.body);
      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await usersService.listUsers(page, limit);
      sendSuccess(res, result, 'Users fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const user = await usersService.getUserById(req.params.id);
      sendSuccess(res, user, 'User fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateUserRole(req, res, next) {
    try {
      const user = await usersService.updateUserRole(req.params.id, req.body.role);
      sendSuccess(res, user, 'User role updated successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { usersController };
