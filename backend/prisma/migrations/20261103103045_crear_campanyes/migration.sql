-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "map_image_url" TEXT,
    "invite_code" VARCHAR(8) NOT NULL,
    "invite_open" BOOLEAN NOT NULL DEFAULT true,
    "max_players" INTEGER NOT NULL DEFAULT 6,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_invite_code_key" ON "campaigns"("invite_code");
