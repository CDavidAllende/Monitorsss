import { Router, Request, Response } from 'express';
import { monitorsService } from '../services/monitors.service';
import { createMonitorSchema } from '../validation/monitor.schema';

export const monitorsRouter = Router();

// POST /api/monitors -> crea un monitor nuevo
monitorsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createMonitorSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const monitor = await monitorsService.create(parsed.data);
    return res.status(201).json(monitor);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/monitors -> lista todos los monitores
monitorsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const monitors = await monitorsService.list();
    return res.json(monitors);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/monitors/:id -> obtiene un monitor puntual
monitorsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const monitor = await monitorsService.getById(req.params.id);

    if (!monitor) {
      return res.status(404).json({ error: 'Monitor no encontrado' });
    }

    return res.json(monitor);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});
