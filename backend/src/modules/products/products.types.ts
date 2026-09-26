export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  categoryId?: string;
}

export interface ProductQueryOptions {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
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
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedProducts {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
