import { z } from "zod";

/** Numéro français : 10 chiffres commençant par 0, ou format international. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ""))
  .refine((v) => /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(v), {
    message: "Numéro de téléphone invalide (ex. 06 12 34 56 78).",
  });

export const nameSchema = z.string().trim().min(1, "Champ obligatoire").max(60);

export const cartLineSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
  optionIds: z.array(z.number().int().positive()).max(20).optional().default([]),
  extraIds: z.array(z.number().int().positive()).max(20).optional().default([]),
  instructions: z.string().max(200).nullable().optional(),
});

export const createOrderSchema = z
  .object({
    restaurantId: z.number().int().positive(),
    orderType: z.enum(["pickup", "delivery"]),
    // ISO du créneau choisi ; "asap" laisse le serveur décider.
    scheduledFor: z.string().datetime().nullable().optional(),
    asap: z.boolean().optional().default(false),
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
    email: z.string().trim().email().max(120).optional().or(z.literal("")).transform((v) => v || null),
    address: z.string().trim().max(160).optional().nullable(),
    addressExtra: z.string().trim().max(160).optional().nullable(),
    postalCode: z.string().trim().max(10).optional().nullable(),
    city: z.string().trim().max(80).optional().nullable(),
    notes: z.string().trim().max(300).optional().nullable(),
    lines: z.array(cartLineSchema).min(1).max(40),
    // Piège à robots : un champ caché qui doit rester vide.
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.orderType !== "delivery") return;
    for (const field of ["address", "postalCode", "city"] as const) {
      if (!value[field]?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Champ obligatoire pour la livraison." });
      }
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
