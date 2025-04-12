/*
  Warnings:

  - You are about to drop the column `email` on the `Operator` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `Operator` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `Operator` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Operator_email_key";

-- AlterTable
ALTER TABLE "Operator" DROP COLUMN "email",
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Operator_username_key" ON "Operator"("username");
