import { ordersRepository, OrderWithItems } from './orders.repository';
import { AppError } from '../../middleware/error.middleware';
import { CreateOrderInput, OrderResponse, PaginatedOrders, OrderStatus } from './orders.types';
import { buildPaginationMeta } from '../../utils/pagination';
import { emailQueue, orderQueue } from '../../jobs/queue';

function toOrderResponse(order: OrderWithItems): OrderResponse {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    shippingAddress: order.shippingAddress,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: Number(item.price),
      subtotal: Number((Number(item.price) * item.quantity).toFixed(2)),
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const ordersService = {
  async createFromCart(userId: string, input: CreateOrderInput): Promise<OrderResponse> {
    const cart = await ordersRepository.findCartWithItems(userId);

    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400, 'CART_EMPTY');
    }

    const items = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.product.price),
    }));

    const totalAmount = Number(
      items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
    );

    try {
      const order = await ordersRepository.createOrderWithItems(
        userId,
        cart.id,
        input.shippingAddress,
        items,
        totalAmount,
      );

      // Enqueue only — neither call is awaited-to-completion; both just
      // record a job in Redis and return immediately. Actual email
      // sending / post-order processing happens later in the workers.
      const user = await ordersRepository.findUserById(userId);
      if (user) {
        await emailQueue.add('order-confirmation-email', {
          type: 'order_confirmation',
          to: user.email,
          name: user.name,
          orderId: order.id,
          totalAmount: Number(order.totalAmount),
        });
      }
      await orderQueue.add('post-order-processing', {
        type: 'post_order_processing',
        orderId: order.id,
      });

      return toOrderResponse(order);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('INSUFFICIENT_STOCK:')) {
        const productId = err.message.split(':')[1];
        throw new AppError(
          `Insufficient stock for one or more items in your cart (product ${productId})`,
          409,
          'INSUFFICIENT_STOCK',
        );
      }
      throw err;
    }
  },

  async getById(id: string, userId: string, userRole: string): Promise<OrderResponse> {
    const order = await ordersRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }
    if (order.userId !== userId && userRole !== 'ADMIN') {
      throw new AppError('You do not have permission to view this order', 403, 'FORBIDDEN');
    }
    return toOrderResponse(order);
  },

  async listForUser(userId: string, page: number, limit: number): Promise<PaginatedOrders> {
    const { orders, total } = await ordersRepository.findManyByUser(userId, page, limit);
    return {
      orders: orders.map(toOrderResponse),
      ...buildPaginationMeta(total, page, limit),
    };
  },

  async cancelOrder(id: string, userId: string): Promise<OrderResponse> {
    const order = await ordersRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }
    if (order.userId !== userId) {
      throw new AppError('You do not have permission to cancel this order', 403, 'FORBIDDEN');
    }
    if (order.status !== 'PENDING') {
      throw new AppError(
        `Cannot cancel an order with status ${order.status}`,
        409,
        'INVALID_ORDER_STATUS',
      );
    }

    const updated = await ordersRepository.updateStatus(id, 'CANCELLED');
    const full = await ordersRepository.findById(updated.id);
    return toOrderResponse(full!);
  },

  async updateStatus(id: string, newStatus: OrderStatus): Promise<OrderResponse> {
    const order = await ordersRepository.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    const currentStatus = order.status as OrderStatus;
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowedNext.includes(newStatus)) {
      throw new AppError(
        `Cannot transition order from ${currentStatus} to ${newStatus}`,
        409,
        'INVALID_STATUS_TRANSITION',
      );
    }

    const updated = await ordersRepository.updateStatus(id, newStatus);
    const full = await ordersRepository.findById(updated.id);
    return toOrderResponse(full!);
  },
};
