import { z } from "zod";

/*
 * Los query params llegan como strings desde la URL (ej. ?take=10&skip=0).
 * z.coerce.number() los convierte automáticamente a número.
 * z.string().min(1) sustituye .nonempty() que está deprecado en Zod v4.
 */
export const productQuerySchema = z.object({
  category: z.string().min(1).optional(),
  take: z.coerce.number().int().positive().max(100).optional().default(20),
  skip: z.coerce.number().int().nonnegative().optional().default(0),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
