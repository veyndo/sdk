import { createCatalogClient } from '@veyndo/sdk/catalog';

const catalog = createCatalogClient({
  baseUrl: process.env.VEYNDO_URL ?? 'https://app.veyndo.ai',
  shop: process.env.VEYNDO_SHOP ?? 'lumen-story-lab-15-o-98aa4751fa',
  locale: process.env.VEYNDO_LOCALE ?? 'de-DE',
});

const first = await catalog.list({ limit: 1 });
const product = first.elements[0];
if (!product) {
  console.log('The selected catalog is empty.');
} else {
  const detail = await catalog.detail(product.id, { limit: 1 });
  console.log({
    name: detail.product.name,
    price: detail.product.price,
    currency: detail.currencyContext.code,
    family: detail.familyId,
    delivery: detail.delivery && [detail.delivery.minDays, detail.delivery.maxDays],
    nextVariantPage: detail.variantsPagination.nextCursor,
  });
  if (first.nextCursor) {
    const second = await catalog.list({ limit: 1, after: first.nextCursor });
    console.log('Next product:', second.elements[0]?.name);
  }
}
