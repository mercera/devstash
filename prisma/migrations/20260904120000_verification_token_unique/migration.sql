-- Email verification looks a link up by its token alone, so the token needs to
-- be unique on its own rather than only as half of the composite primary key.
-- That also makes consuming a link atomic: the delete-by-token is what claims
-- it, so two clicks race on the row and only one can win.

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
