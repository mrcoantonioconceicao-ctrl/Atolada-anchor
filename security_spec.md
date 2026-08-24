# Security Specification: Solana Architect Cloud Storage

## 1. Data Invariants
1. **User Isolation**: All subcollections (`contracts`, `audit_reports`) reside directly under `/users/{userId}/` and require `request.auth.uid == userId`.
2. **Identity Integrity**: In all create/update payloads, the `ownerId` and `uid` fields must match `request.auth.uid`.
3. **Immutability of Keys**: `uid`, `id`, `ownerId`, and `createdAt` cannot be modified after initial creation.
4. **Boundary Limits**: All string fields are bounded by strict `.size()` limits (e.g. `sourceCode <= 50000`, `title <= 120`).
5. **Timestamp Security**: `createdAt` and `updatedAt` are strictly validated using `request.time`.
6. **No Blanket Reads**: All list and get operations are guarded so users can only access their own user document and subcollections.

## 2. The Dirty Dozen Malicious Payloads Tested
1. **Unauthenticated Read/Write**: Request without `request.auth` -> Denied.
2. **Cross-User Snooping**: User A attempting to read `/users/{userB}/contracts/{contractId}` -> Denied.
3. **Owner Spoofing**: User A creating a contract with `ownerId: "userB"` -> Denied.
4. **ID Injection / Path Poisoning**: Attempting to use non-alphanumeric or 1KB document IDs -> Denied by `isValidId`.
5. **Ghost Field Injection**: Adding unexpected fields (e.g. `isAdmin: true` or `bypassed: true`) on create/update -> Denied.
6. **Code Size Exhaustion**: Sending `sourceCode` with 2MB payload (> 50,000 chars) -> Denied.
7. **Title Size Overflow**: Sending a contract `title` > 120 chars -> Denied.
8. **Client Timestamp Manipulation**: Sending artificial past/future `createdAt` instead of `request.time` -> Denied.
9. **Immutable Key Mutator**: Modifying `ownerId` or `createdAt` during an update -> Denied.
10. **Numeric Score Forgery**: Submitting negative scores or > 100 for audit results -> Denied.
11. **Direct User Escalation**: Attempting to self-grant elevated roles on the user profile -> Denied.
12. **Subcollection Escaping**: Querying across all contracts using collection group without user bounds -> Denied.
