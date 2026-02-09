-- Add packId to SkillRating + UnitProgress and update uniqueness to be pack-scoped.

-- SkillRating
ALTER TABLE "SkillRating" ADD COLUMN "packId" TEXT;

UPDATE "SkillRating" SET "packId" = 'govuk-prototyping' WHERE "packId" IS NULL;

ALTER TABLE "SkillRating" ALTER COLUMN "packId" SET NOT NULL;

DROP INDEX IF EXISTS "SkillRating_userId_skillId_key";
CREATE UNIQUE INDEX "SkillRating_userId_packId_skillId_key" ON "SkillRating"("userId", "packId", "skillId");
CREATE INDEX IF NOT EXISTS "SkillRating_packId_idx" ON "SkillRating"("packId");

-- UnitProgress
ALTER TABLE "UnitProgress" ADD COLUMN "packId" TEXT;

UPDATE "UnitProgress" SET "packId" = 'govuk-prototyping' WHERE "packId" IS NULL;

ALTER TABLE "UnitProgress" ALTER COLUMN "packId" SET NOT NULL;

DROP INDEX IF EXISTS "UnitProgress_userId_unitId_key";
CREATE UNIQUE INDEX "UnitProgress_userId_packId_unitId_key" ON "UnitProgress"("userId", "packId", "unitId");
CREATE INDEX IF NOT EXISTS "UnitProgress_packId_idx" ON "UnitProgress"("packId");
