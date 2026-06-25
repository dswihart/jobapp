# API Response Contracts

This document defines response shapes expected by frontend consumers to avoid drift and silent UI failures.

## Principles

- Prefer stable JSON envelopes for list endpoints: success + data payload.
- Do not return full relation models when only a subset is needed.
- Never expose secrets or secret-adjacent fields (password, tokens, private keys, hashes).

## Applications API

### GET /api/applications

Recommended response:

{
   success: true,
  applications: [
    {
      id: ...,
      company: ...,
      role: ...,
      status: APPLIED,
      notes: ...,
      jobUrl: ...,
      appliedDate: 2026-03-07T12:00:00.000Z,
      createdAt: ...,
      updatedAt: ...,
      contacts: [],
      resume: null,
      coverLetter: null
    }
  ]
}

Current implementation note (as of March 7, 2026):
- Endpoint returns a raw array instead of an envelope.
- Some frontend code expects success + applications.

Action:
- Standardize server and clients on one contract.
- If using envelope shape, update all consumers accordingly.

### POST /api/applications

Recommended response:

{
  success: true,
  application: {
    id: ...
  }
}

## Security Guardrails

- Never include full user relation by default.
- If user info is required, explicitly select safe fields only:
  - id
  - name
  - email (only if required by UI)
- Exclude at all times:
  - password
  - any auth/session/internal secret fields

## Backward Compatibility Policy

When changing response shapes:

1. Add versioned contract note in this file.
2. Update all frontend callers in the same PR.
3. Add one integration test for each changed endpoint.
4. Record the effective date and migration window.

## Change Log

- 2026-03-07: Initial contract baseline added.
