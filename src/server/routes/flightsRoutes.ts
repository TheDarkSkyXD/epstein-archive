import { Router } from 'express';
import { flightsRepository } from '../db/flightsRepository.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number((req.query as any).page || 1));
    const limit = Math.min(500, Math.max(1, Number((req.query as any).limit || 50)));
    const startDate = String((req.query as any).startDate || '').trim() || undefined;
    const endDate = String((req.query as any).endDate || '').trim() || undefined;
    const passenger = String((req.query as any).passenger || '').trim() || undefined;
    const airport = String((req.query as any).airport || '').trim() || undefined;

    const payload = await flightsRepository.getFlights({
      page,
      limit,
      startDate,
      endDate,
      passenger,
      airport,
    });

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await flightsRepository.getFlightStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/airports', async (_req, res, next) => {
  try {
    const airports = await flightsRepository.getAirportCoords();
    res.json(airports);
  } catch (error) {
    next(error);
  }
});

router.get('/passengers', async (_req, res, next) => {
  try {
    const passengers = await flightsRepository.getUniquePassengers();
    res.json(passengers);
  } catch (error) {
    next(error);
  }
});

router.get('/co-occurrences', async (req, res, next) => {
  try {
    const minFlights = Math.max(1, Number((req.query as any).minFlights || 2));
    const limit = Math.min(200, Math.max(1, Number((req.query as any).limit || 100)));
    const rows = await flightsRepository.getPassengerCoOccurrences(minFlights);
    const shaped = rows.slice(0, limit).map((r: any) => ({
      passenger1: String(r.passenger1 || ''),
      passenger2: String(r.passenger2 || ''),
      flights_together: Number(r.flightsTogether || 0),
      first_flight: r.firstFlight || null,
      last_flight: r.lastFlight || null,
    }));
    res.json(shaped);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid flight id' });
    const flight = await flightsRepository.getFlightById(id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });
    res.json(flight);
  } catch (error) {
    next(error);
  }
});

export default router;
