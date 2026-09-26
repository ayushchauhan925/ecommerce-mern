export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errorCode: string;
}

export type Role = 'CUSTOMER' | 'ADMIN';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: SafeUser;
  tokens: AuthTokens;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImageResponse {
  id: string;
  url: string;
  publicId: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  images: ProductImageResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedProducts {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProductSort = 'price_asc' | 'price_desc' | 'newest' | 'oldest';

export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
}

export interface CartItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  totalItems: number;
  totalAmount: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

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
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedOrders {
  orders: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateIntentResponse {
  clientSecret: string;
  paymentId: string;
  amount: number;
  currency: string;
}

export interface ReviewResponse {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedReviews {
  reviews: ReviewResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedUsers {
  users: SafeUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
