import { NextRequest, NextResponse } from "next/server";
import { productQuerySchema } from "@/server/validators/product.validator";
import { getProducts } from "@/server/services/product.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const parsed = productQuerySchema.safeParse({
      category: searchParams.get("category") ?? undefined,
      take: searchParams.get("take") ?? undefined,
      skip: searchParams.get("skip") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const products = await getProducts(parsed.data);
    return NextResponse.json(products);
  } catch (error: unknown) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
