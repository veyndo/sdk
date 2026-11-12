# Changelog

## Unreleased

- Run Connected Shop with the published 0.4.6 catalog and Checkout clients.
  The browser host now uses the cart preview and apply path for variant review.

## 0.4.12

- Use existing same-origin HttpOnly buyer sessions in the Account and
  Checkout SDK clients, including the current shop's CSRF proof.

## 0.4.11

- List localized purchased files and download bounded attachments through
  `@veyndo/sdk/account`.

## 0.4.10

- Read the buyer profile and save editable contact fields through
  `@veyndo/sdk/account`. Address book changes use the dedicated address methods.

## 0.4.9

- Add typed buyer address book reads, creation, updates and deletion through
  `@veyndo/sdk/account`. Updates and deletions require the address revision.

## 0.4.8

- Download the buyer's own receipt as PDF bytes via `orders.receiptPdf`.
  The download uses the existing buyer session and response size limit.

## 0.4.7

- Add the typed `@veyndo/sdk/account` client for buyer order history,
  cursor pagination and order details with customer-visible receipt metadata.

## 0.4.6

- Add typed delivery countries, shipping methods and payment methods to the
  Checkout client. Save an explicit selection at the current cart revision
  and use the quote returned by Core for purchase confirmation.

## 0.4.5

- Add typed Store API cart creation, reads, additions, review and apply to
  `@veyndo/sdk/checkout`. The preview returns Core's quote and review
  fingerprint. Applying the proposal requires its current cart revision.

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
