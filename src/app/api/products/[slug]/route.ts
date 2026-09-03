import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/server/services/product.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // En Next.js 16 params es una Promise — await es obligatorio
  const { slug } = await params;

  try {
    const product = await getProductBySlug(slug);

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[GET /api/products/${slug}]`, error);
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
