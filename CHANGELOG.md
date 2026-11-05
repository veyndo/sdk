# Changelog

## 0.1.1

- Preserve uncertain outcomes for tool/domain and internal JSON-RPC failures.
  A component can fail after an external write; its error text is not proof of
  rollback. Standard JSON-RPC request-validation rejections remain distinguishable.

## 0.1.0

- Added dependency-free JSON HTTP and stateless MCP transport with scoped client
  configuration, cancellation, bounded responses and structured errors.
- Exported canonical native input contracts and the existing guest app bridge
  with exact source provenance and documented ESM declaration adaptation.
- Added independent wire tests, negative type checks, Node/browser examples and
  Node 22/24 CI. Native domain response contracts and broader MCP transports remain
  tracked follow-ups.
