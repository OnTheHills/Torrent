const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleIdToken(credential) {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new Error("Google token is missing an email.");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    firstname: payload.given_name,
    lastname: payload.family_name,
    picture: payload.picture,
    emailVerified: Boolean(payload.email_verified),
  };
}

module.exports = { verifyGoogleIdToken };