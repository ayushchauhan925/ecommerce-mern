import { prisma } from '../../config/database';
import { Order, Payment, PaymentStatus } from '@prisma/client';

export const paymentsRepository = {
  findOrderById(orderId: string): Promise<Order | null> {
    return prisma.order.findUnique({ where: { id: orderId } });
  },

  findPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { orderId } });
  },

  findPaymentByIntentId(stripePaymentIntentId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { stripePaymentIntentId } });
  },

  createPayment(data: {
    orderId: string;
    stripePaymentIntentId: string;
    amount: number;
    currency: string;
  }): Promise<Payment> {
    return prisma.payment.create({
      data: { ...data, status: PaymentStatus.PENDING },
    });
  },

  async updatePaymentStatus(id: string, status: PaymentStatus): Promise<Payment> {
    return prisma.payment.update({ where: { id }, data: { status } });
  },

  updatePaymentForRetry(id: string, newStripePaymentIntentId: string): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        stripePaymentIntentId: newStripePaymentIntentId,
        status: PaymentStatus.PENDING,
      },
    });
  },

  updateOrderStatus(orderId: string, status: 'PAID' | 'CANCELLED'): Promise<Order> {
    return prisma.order.update({ where: { id: orderId }, data: { status } });
  },

  findUserById(userId: string): Promise<{ id: string; name: string; email: string } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
  },
};
