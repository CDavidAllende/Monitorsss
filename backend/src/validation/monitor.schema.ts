import { z } from 'zod';

const ruleConfigSchemas = {
  hash_diff: z.object({}).strict(),
  text_contains: z.object({
    text: z.string().min(1, 'El texto a buscar es requerido'),
  }),
  text_not_contains: z.object({
    text: z.string().min(1, 'El texto a buscar es requerido'),
  }),
  price_threshold: z.object({
    operator: z.enum(['lt', 'lte', 'gt', 'gte']),
    value: z.number(),
    extraction_regex: z.string().optional(),
    manual_value: z.number().optional(),
  }),
  availability: z.object({
  expect: z.enum(['in_stock', 'out_of_stock']),
  map: z.record(z.string(), z.array(z.string())),  }),
} as const;

export type RuleType = keyof typeof ruleConfigSchemas;

const ruleUnion = z.discriminatedUnion('ruleType', [
  z.object({ ruleType: z.literal('hash_diff'), ruleConfig: ruleConfigSchemas.hash_diff.default({}) }),
  z.object({ ruleType: z.literal('text_contains'), ruleConfig: ruleConfigSchemas.text_contains }),
  z.object({ ruleType: z.literal('text_not_contains'), ruleConfig: ruleConfigSchemas.text_not_contains }),
  z.object({ ruleType: z.literal('price_threshold'), ruleConfig: ruleConfigSchemas.price_threshold }),
  z.object({ ruleType: z.literal('availability'), ruleConfig: ruleConfigSchemas.availability }),
]);

const baseMonitorSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  url: z.string().url('Debe ser una URL válida'),
  intervalMinutes: z
    .number()
    .int()
    .positive('El intervalo debe ser un número positivo de minutos'),
  selector: z.string().min(1).optional(),
});

// Si el body no manda ruleType, se asume hash_diff (comportamiento Fase 1-3, sin cambios)
export const createMonitorSchema = z.preprocess((val) => {
  if (typeof val === 'object' && val !== null && !('ruleType' in val)) {
    return { ...val, ruleType: 'hash_diff', ruleConfig: {} };
  }
  return val;
}, baseMonitorSchema.and(ruleUnion));

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;

// Para PATCH: todo opcional, pero si mandás ruleType, ruleConfig tiene que matchear ese tipo
export const updateMonitorSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    url: z.string().url('Debe ser una URL válida').optional(),
    intervalMinutes: z.number().int().positive().optional(),
    selector: z.string().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
    ruleType: z.enum(['hash_diff', 'text_contains', 'text_not_contains', 'price_threshold', 'availability']).optional(),
    ruleConfig: z.record(z.string(), z.any()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ruleType === undefined) return;

    const schema = ruleConfigSchemas[data.ruleType];
    const result = schema.safeParse(data.ruleConfig ?? {});

    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ruleConfig'],
        message: `ruleConfig inválido para el tipo "${data.ruleType}": ${result.error.issues.map((i) => i.message).join(', ')}`,
      });
    }
  });

export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;