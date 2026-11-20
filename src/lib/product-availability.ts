export type CatalogInventory = {
  stock: number;
  price: { toString(): string };
  variants: { stock: number; price: { toString(): string } | null }[];
  _count: { variants: number };
};

export function catalogAvailability(product: CatalogInventory) {
  const requiresVariant = product._count.variants > 0;
  const sellable = product.variants.filter((variant) => variant.stock > 0);
  const prices = (sellable.length ? sellable : product.variants).map((variant) => Number(variant.price ?? product.price));
  return {
    requiresVariant,
    price: prices.length ? String(Math.min(...prices)) : product.price.toString(),
    stock: requiresVariant ? sellable.reduce((max, v) => Math.max(max, v.stock), 0) : product.stock,
  };
}
