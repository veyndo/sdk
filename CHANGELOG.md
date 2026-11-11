# Changelog

## 0.4.4

- Add the typed `@veyndo/sdk/checkout` client for draft creation, reviewed
  confirmation and original receipt lookup through Core.
- Let Connected Shop display a successful confirmation directly. When the
  outcome is uncertain, it checks the original session, cart and buyer.

## 0.4.3

- Ship runnable Node and browser catalog examples in the release archive.
  The browser uses a local Node host to search, page through the catalog
  and inspect product details from the configured public shop.

## 0.4.2

- Add the typed `@veyndo/sdk/catalog` client for Store API listings, product
  details and variant pages, with a runnable public shop example.
- Report a failed catalog POST as a failed read, with a known write outcome.

## 0.4.1

- Infer declared native result types from the Veyndo operation registry.
  Flow draft validation returns the revision and a literal `saved: false`.
- Allow a standalone component client to supply its own result types.
  Undeclared results keep the existing JSON type.

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
