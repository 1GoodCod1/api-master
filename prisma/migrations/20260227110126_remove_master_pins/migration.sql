/*
  Warnings:

  - You are about to drop the `master_pins` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "master_pins" DROP CONSTRAINT "master_pins_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "master_pins" DROP CONSTRAINT "master_pins_cityId_fkey";

-- DropForeignKey
ALTER TABLE "master_pins" DROP CONSTRAINT "master_pins_masterId_fkey";

-- DropTable
DROP TABLE "master_pins";
