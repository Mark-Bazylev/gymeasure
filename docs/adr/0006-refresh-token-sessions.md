# 0006. Refresh-token device sessions

## Status

Accepted

## Context

A single 30-day JWT forced frequent re-login for casual use and could not revoke individual devices.

## Decision

Issue short-lived access JWTs (15m) plus hashed, rotating refresh tokens stored per device (180d). Mobile keeps the refresh token in SecureStore. Normal logout revokes only the current device session. Google Sign-In (Android) verifies ID tokens server-side and links by verified email / Google subject.

## Consequences

- Users stay signed in across app restarts without weakening revocation
- Schema grows `refresh_sessions` and `auth_identities`
- Password hashes become nullable for Google-only accounts
