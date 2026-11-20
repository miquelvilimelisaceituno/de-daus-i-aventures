-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('master', 'player');

-- CreateTable
CREATE TABLE "memberships" (
    "user_id" VARCHAR(128) NOT NULL,
    "campaign_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("user_id","campaign_id")
);

-- CreateIndex
CREATE INDEX "memberships_campaign_id_idx" ON "memberships"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_one_master_per_campaign" ON "memberships"("campaign_id") WHERE ("role" = 'master');

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
