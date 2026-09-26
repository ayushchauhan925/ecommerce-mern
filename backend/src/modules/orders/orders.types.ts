export interface CreateOrderInput {
  shippingAddress: string;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderResponse {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  items: OrderItemResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedOrders {
  orders: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
