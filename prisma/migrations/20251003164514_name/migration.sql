/*
  Warnings:

  - Made the column `bnsName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `displayName` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "bnsName" SET NOT NULL,
ALTER COLUMN "displayName" SET NOT NULL;
