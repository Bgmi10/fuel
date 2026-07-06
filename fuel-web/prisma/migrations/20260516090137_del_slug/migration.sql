/*
  Warnings:

  - You are about to drop the column `slug` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `BlogCategory` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `BlogFaq` table. All the data in the column will be lost.
  - Added the required column `description` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Blog_slug_idx";

-- DropIndex
DROP INDEX "Blog_slug_key";

-- DropIndex
DROP INDEX "BlogCategory_slug_key";

-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "slug",
ADD COLUMN     "description" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BlogCategory" DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "BlogFaq" DROP COLUMN "order";
