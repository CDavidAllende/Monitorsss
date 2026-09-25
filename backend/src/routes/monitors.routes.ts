import { Router, Request, Response } from 'express';
import { monitorsService } from '../services/monitors.service';
import { createMonitorSchema, updateMonitorSchema } from '../validation/monitor.schema';

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
    const { id } = req.params;

    if (typeof id !== 'string') {
      return res.status(400).json({
        error: 'ID de monitor inválido',
      });
    }

    const monitor = await monitorsService.getById(id);

    if (!monitor) {
      return res.status(404).json({
        error: 'Monitor no encontrado',
      });
    }

    return res.json(monitor);
  } catch (err) {
    return res.status(500).json({
      error: (err as Error).message,
    });
  }
});

// PATCH /api/monitors/:id -> actualiza un monitor existente (incluye rule_type/rule_config)
monitorsRouter.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de monitor inválido' });
  }

  const parsed = updateMonitorSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const monitor = await monitorsService.update(id, parsed.data);

    if (!monitor) {
      return res.status(404).json({ error: 'Monitor no encontrado' });
    }

    return res.json(monitor);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/monitors/:id/history -> historial de checks de un monitor
monitorsRouter.get(
  '/:id/history',
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (typeof id !== 'string') {
        return res.status(400).json({
          error: 'ID de monitor inválido',
        });
      }

      const limit = req.query.limit
        ? Number(req.query.limit)
        : 100;

      const history = await monitorsService.getHistory(id, limit);

      return res.json(history);
    } catch (err) {
      return res.status(500).json({
        error: (err as Error).message,
      });
    }
  }
);