-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(128) NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "avatar_url" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
