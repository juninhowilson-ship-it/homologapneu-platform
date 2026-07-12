import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableTh,
  TableTd,
} from "@/components/ui/Table";
import type { Usuario } from "@/types/user";

type Props = {
  usuarios: Usuario[];
  isLoading: boolean;
  currentUserId?: number;
  onEdit: (usuario: Usuario) => void;
  onDelete: (usuario: Usuario) => void;
};

export default function UsuariosTable({
  usuarios,
  isLoading,
  currentUserId,
  onEdit,
  onDelete,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <EmptyState
        title="Nenhum usuário encontrado"
        description="Ajuste a busca ou os filtros, ou cadastre um novo usuário."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableTh>Nome</TableTh>
          <TableTh>E-mail</TableTh>
          <TableTh>Perfil</TableTh>
          <TableTh>Status</TableTh>
          <TableTh>Ações</TableTh>
        </tr>
      </TableHead>

      <TableBody>
        {usuarios.map((usuario) => (
          <TableRow key={usuario.id}>
            <TableTd className="font-semibold">
              {usuario.name}
              {usuario.id === currentUserId && (
                <span className="ml-2 text-xs text-muted-foreground">(você)</span>
              )}
            </TableTd>
            <TableTd>{usuario.email}</TableTd>
            <TableTd>
              <Badge tone={usuario.role === "ADMIN" ? "warning" : "neutral"}>
                {usuario.role === "ADMIN" ? "Administrador" : "Usuário"}
              </Badge>
            </TableTd>
            <TableTd>
              <Badge tone={usuario.isActive ? "success" : "neutral"}>
                {usuario.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </TableTd>

            <TableTd>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(usuario)}
                >
                  Editar
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(usuario)}
                  disabled={usuario.id === currentUserId}
                  className="text-red-600"
                >
                  Excluir
                </Button>
              </div>
            </TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
