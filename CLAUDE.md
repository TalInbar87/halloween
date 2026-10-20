# Halloween Map — Project Instructions

See `README.md` for the stack and the privacy/security model.

## Migrations — GRANT Required for Every New Table

Since 2026-10-30, tables created in `public` get no automatic grants — without one, the API returns `permission denied`.
**Every migration that creates a table must decide its grants in the same file:**

- Readable through the API → grant only the public columns, as `houses` does:
  ```sql
  grant select (<col>, <col>) on public.<table> to anon, authenticated;
  ```
- Reached only through `security definer` functions (like `app_secret`, `auth_failures`, `remove_attempts`) → no grant, on purpose. Say so in a comment.
- Every new or re-signed RPC needs its own `grant execute on function public.<fn>(<args>) to anon, authenticated;`
