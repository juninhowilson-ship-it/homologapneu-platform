-- CreateEnum
CREATE TYPE "PasswordResetChannel" AS ENUM ('EMAIL', 'ADMIN');

-- CreateEnum
CREATE TYPE "PasswordResetStatus" AS ENUM ('PENDENTE', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "password_reset_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "channel" "PasswordResetChannel" NOT NULL,
    "status" "PasswordResetStatus" NOT NULL DEFAULT 'PENDENTE',
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_requests_tokenHash_key" ON "password_reset_requests"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_requests_userId_status_idx" ON "password_reset_requests"("userId", "status");

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: mesma política das demais tabelas (deny por padrão; acesso via Prisma)
ALTER TABLE "password_reset_requests" ENABLE ROW LEVEL SECURITY;
