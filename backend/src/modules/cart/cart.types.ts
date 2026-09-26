export interface AddCartItemInput {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
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
