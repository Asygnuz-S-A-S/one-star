import {
  findManyProducts,
  findProductBySlug,
} from "../repositories/product.repository";
import type { ProductQuery } from "../validators/product.validator";

/*
 * DTO — tipos JS puros, seguros para JSON.stringify.
 * Nunca salen tipos Prisma ni Decimal de esta capa hacia la UI.
 */

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
}

export interface ProductImageDTO {
  id: string;
  url: string;
  alt: string;
  position: number;
}

export interface VariantDTO {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
}

export interface ProductDTO {
  id: string;
  slug: string;
  name: string;
  basePrice: number;        // Decimal → number (Decimal.toNumber())
  isOnSale: boolean;
  salePrice: number | null; // Decimal? → number | null
  description: string | null;
  category: CategoryDTO;
  images: ProductImageDTO[];
  variants: VariantDTO[];
  createdAt: string;        // Date → ISO string (seguro en JSON)
  updatedAt: string;
}

/*
 * Inferimos el tipo de retorno del repositorio para no duplicar la configuración
 * del include. Awaited<ReturnType<...>> resuelve el Promise y extrae el tipo.
 */
type RawProduct = NonNullable<Awaited<ReturnType<typeof findProductBySlug>>>;

function mapToDTO(raw: RawProduct): ProductDTO {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    basePrice: raw.basePrice.toNumber(),
    isOnSale: raw.isOnSale,
    salePrice: raw.salePrice ? raw.salePrice.toNumber() : null,
    description: raw.description ?? null,
    category: {
      id: raw.category.id,
      name: raw.category.name,
      slug: raw.category.slug,
    },
    images: raw.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      position: img.position,
    })),
    variants: raw.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
    })),
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

export async function getProducts(filter: ProductQuery): Promise<ProductDTO[]> {
  const rows = await findManyProducts(filter);
  return rows.map(mapToDTO);
}

export async function getProductBySlug(
  slug: string
): Promise<ProductDTO | null> {
  const raw = await findProductBySlug(slug);
  return raw ? mapToDTO(raw) : null;
}
