export type UserRole = "ADMIN" | "USUARIO";

export type Usuario = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UsuarioListResponse = {
  data: Usuario[];
  total: number;
  page: number;
  pageSize: number;
};

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};
