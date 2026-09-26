export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface UpdateProfileInput {
  name: string;
}

export interface PaginatedUsers {
  users: SafeUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}