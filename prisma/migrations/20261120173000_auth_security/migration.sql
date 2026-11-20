-- No existing customer/order data is updated. Previous JWTs have no session row.
ALTER TABLE "User" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;
-- Legacy recovery tokens were issued by the old browser-visible flow. The
-- nullable version intentionally makes all of them ineligible without a rewrite.
ALTER TABLE "PasswordResetToken" ADD COLUMN "authVersion" INTEGER;
CREATE TABLE "AuthSession" (
  "tokenHash" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authVersion" INTEGER NOT NULL,
  "role" "Role" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE TABLE "SecurityRateBucket" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL CHECK ("count" > 0),
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "SecurityRateBucket_expiresAt_idx" ON "SecurityRateBucket"("expiresAt");

-- Also invalidate sessions when an operator changes authentication fields outside the app.
CREATE FUNCTION shopbd_bump_auth_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."role" IS DISTINCT FROM OLD."role" OR NEW."isBlocked" IS DISTINCT FROM OLD."isBlocked"
      OR NEW."passwordHash" IS DISTINCT FROM OLD."passwordHash" OR NEW."email" IS DISTINCT FROM OLD."email" THEN
    NEW."authVersion" := GREATEST(NEW."authVersion", OLD."authVersion" + 1);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER shopbd_user_auth_version BEFORE UPDATE OF "role", "isBlocked", "passwordHash", "email"
ON "User" FOR EACH ROW EXECUTE FUNCTION shopbd_bump_auth_version();
