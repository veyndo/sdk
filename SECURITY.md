# Security

Report a suspected issue privately to the repository owner through GitHub before
publishing credentials, customer records or exploitation details. Use synthetic
shops, tokens and local HTTP fixtures for reproductions.

The SDK does not authorize requests. Each service must derive the current actor
and enforce its own tenant, operation, environment and object permissions.
Never place merchant credentials in browser code. The guest app bridge is a
separate entry point governed by the embedding host.

Cross-origin redirects are rejected and requests are never automatically retried.
After an ambiguous write, reconcile its original operation identity before retrying.
