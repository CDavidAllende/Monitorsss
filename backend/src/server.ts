import express from 'express';
import { monitorsRouter } from './routes/monitors.routes';

const app = express();
app.use(express.json());

app.use('/api/monitors', monitorsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
