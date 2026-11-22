const PUBLIC_USER_FIELDS = ["_id", "email", "role", "firstname", "lastname", "username", "picture"];

function toPublicUser(user) {
  if (!user) return null;
  const value = user.toObject ? user.toObject() : user;
  return Object.fromEntries(PUBLIC_USER_FIELDS
    .filter((field) => value[field] !== undefined)
    .map((field) => [field, value[field]]));
}

module.exports = { toPublicUser };
