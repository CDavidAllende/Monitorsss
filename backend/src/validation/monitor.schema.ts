import { z } from 'zod';

export const createMonitorSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  url: z.string().url('Debe ser una URL válida'),
  intervalMinutes: z
    .number()
    .int()
    .positive('El intervalo debe ser un número positivo de minutos'),
  // Opcional: si no se da, se monitorea la página completa (Fase 1).
  selector: z.string().min(1).optional(),
});

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;