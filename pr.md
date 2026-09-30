# Fix vendor profile persistence and access control

## Summary

Update the vendor profile flow so authenticated vendors can load their existing profile and edit it without creating duplicate records.

## Changes

- Added `GET /vendor-profiles/get/:userId` to retrieve a vendor profile by user ID.
- Added self-or-admin authorization for user-ID-based profile lookups.
- Added repository and service support for finding profiles by `userId`.
- Updated the vendor profile page to:
  - Check for an existing profile before submitting.
  - Use `PATCH` for existing profiles.
  - Use `POST` when no profile exists.
- Added HTTP status codes to API errors so the frontend can handle `404` profile lookups correctly.

## Testing

- Not run yet.

## Notes for Reviewers

- Requests for another user’s profile return `403` unless the requester is an admin.
- A missing profile returns `404`, which the frontend treats as the create-new-profile case.
