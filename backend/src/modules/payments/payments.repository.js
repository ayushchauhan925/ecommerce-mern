const { prisma } = require('../../config/database');
const { PaymentStatus } = require('@prisma/client');

const paymentsRepository = {
  findOrderById(orderId) {
    return prisma.order.findUnique({ where: { id: orderId } });
  },

  findPaymentByOrderId(orderId) {
    return prisma.payment.findUnique({ where: { orderId } });
  },

  findPaymentByIntentId(stripePaymentIntentId) {
    return prisma.payment.findUnique({ where: { stripePaymentIntentId } });
  },

  createPayment(data) {
    return prisma.payment.create({
      data: { ...data, status: PaymentStatus.PENDING },
    });
  },

  async updatePaymentStatus(id, status) {
    return prisma.payment.update({ where: { id }, data: { status } });
  },

  updatePaymentForRetry(id, newStripePaymentIntentId) {
    return prisma.payment.update({
      where: { id },
      data: {
        stripePaymentIntentId: newStripePaymentIntentId,
        status: PaymentStatus.PENDING,
      },
    });
  },

  updateOrderStatus(orderId, status) {
    return prisma.order.update({ where: { id: orderId }, data: { status } });
  },

  findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
  },
};

module.exports = { paymentsRepository };
