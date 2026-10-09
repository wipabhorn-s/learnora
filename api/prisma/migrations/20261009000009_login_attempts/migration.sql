-- CreateTable
CREATE TABLE "login_attempts" (
    "key" CHAR(64) NOT NULL,
    "count" INTEGER NOT NULL,
    "first_at" TIMESTAMPTZ(3) NOT NULL,
    "locked_until" TIMESTAMPTZ(3),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "login_attempts_first_at_idx" ON "login_attempts"("first_at");
