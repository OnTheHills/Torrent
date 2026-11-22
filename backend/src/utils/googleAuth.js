const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const GOOGLE_ISSUERS = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);

/**
 * Verify a Google ID token (GIS credential). Never treat this as a TORRENT
 * session JWT — the auth controller mints a separate HttpOnly session cookie.
 */
async function verifyGoogleIdToken(credential, { nonce } = {}) {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Google token is missing an email.");
  }

  if (!GOOGLE_ISSUERS.has(String(payload.iss || ""))) {
    throw new Error("Google token issuer is not trusted.");
  }

  // ID tokens only — reject anything that looks like an access token shape.
  if (payload.typ && String(payload.typ).toLowerCase() === "at+jwt") {
    throw new Error("Access tokens are not accepted for sign-in.");
  }

  if (!payload.email_verified) {
    throw new Error("Google email is not verified.");
  }

  // Bind the credential to the browser transaction that started GIS (ASVS V10.1.2).
  if (nonce) {
    if (!payload.nonce || payload.nonce !== nonce) {
      throw new Error("Google token nonce mismatch.");
    }
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    firstname: payload.given_name,
    lastname: payload.family_name,
    picture: payload.picture,
    emailVerified: true,
  };
}

module.exports = { verifyGoogleIdToken, GOOGLE_ISSUERS };
