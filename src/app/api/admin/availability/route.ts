import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { canAccessRestaurant } from "@/lib/auth/session";
import { setProductAvailability } from "@/lib/repo/admin";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const schema = z.object({
  restaurantId: z.number().int().positive(),
  productId: z.number().int().positive(),
  isAvailable: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
});

/** Bascule « Rupture » / « Proposé ici » — appelée depuis le comptoir. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  // Un responsable ne modifie que son établissement. On refuse explicitement
  // plutôt que de rediriger silencieusement vers le sien : une requête qui
  // « réussit » en modifiant autre chose que ce qui était demandé est pire
  // qu'une erreur.
  const { restaurantId } = parsed.data;
  if (!canAccessRestaurant(auth.admin, restaurantId)) {
    return NextResponse.json(
      { error: "Cet établissement ne relève pas de votre périmètre." },
      { status: 403 },
    );
  }

  const result = await setProductAvailability(restaurantId, parsed.data.productId, {
    isAvailable: parsed.data.isAvailable,
    outOfStock: parsed.data.outOfStock,
  });

  revalidatePath("/", "layout");
  return NextResponse.json(result);
}
