# Changelog

## 0.4.0

- Negotiate MCP Apps, discover and read linked resources, and retain the full
  result of a tool call for a host that renders the view. The Veyndo service
  continues to enforce resource, actor and tenant scope.
- Add a typed client for the independent Knowledge service. It supports
  product and document sources, revisioned writes, paged reads, graphs and
  checking whether retrieved evidence is still current.
- Add the read-only Flow draft validator and examples for installed MCP App
  views, Knowledge and the Nord Atelier storefront experiment.

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
