# Security Specification - Stock Trading App

## Data Invariants
1. A user can only read and write their own profile.
2. A user can only read and write their own holdings in the `portfolios` collection.
3. A user can only read and write their own transactions.
4. Transactions are immutable once created (optional, but good for auditing).
5. Holding quantities cannot be negative (handled by application logic, but rules should ensure the write is valid).

## The Dirty Dozen Payloads
1. Attempt to create a holding for another user UID.
2. Attempt to update another user's holding quantity.
3. Attempt to read all holdings (blanket read).
4. Attempt to delete a transaction.
5. Attempt to create a transaction with a fake timestamp.
6. Attempt to modify the `userId` of an existing holding.
7. Attempt to inject a 1MB string into the `symbol` field.
8. Attempt to set `quantity` to a non-number.
9. Attempt to create a user profile with an admin flag (if we had one).
10. Attempt to read another user's profile.
11. Attempt to update a holding without being signed in.
12. Attempt to batch update multiple users' holdings.

## Test Plan
I will verify these invariants using the rules. Tests would ideally be in a `.test.ts` file, but for now I will focus on the rules implementation and use the Red Team Audit.
