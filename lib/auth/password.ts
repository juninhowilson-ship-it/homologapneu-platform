import "server-only";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Hash bcrypt fixo (não corresponde a nenhuma senha real) usado apenas para
// gastar o mesmo tempo de CPU de um bcrypt.compare() quando o e-mail
// informado no login não existe — evita que a ausência do usuário seja
// detectável por diferença de tempo de resposta (enumeração de contas).
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Yg0v6NfMFxN7bkrpwHUHKX/Nz3v3W";

export async function verifyDummyPassword(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
