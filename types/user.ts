export type UserRole = "ADMIN" | "USUARIO";

export type Usuario = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Presente apenas na listagem: usuário pediu recuperação de senha e aguarda
  // o admin definir uma nova (ou o link por e-mail ainda não foi usado).
  resetPendente?: boolean;
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
