-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('npc', 'location', 'faction');

-- CreateTable
CREATE TABLE "entities" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "type" "entity_type" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "search_name" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_secret" BOOLEAN NOT NULL DEFAULT true,
    "map_x" DOUBLE PRECISION,
    "map_y" DOUBLE PRECISION,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entities_campaign_id_type_idx" ON "entities"("campaign_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "entities_id_campaign_id_key" ON "entities"("id", "campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "entities_id_campaign_id_type_key" ON "entities"("id", "campaign_id", "type");

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
