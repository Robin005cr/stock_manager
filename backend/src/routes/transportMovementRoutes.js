import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { TransportMovement } from '../models/TransportMovement.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactMatch(field, value) {
  if (!value) return null;
  return { [field]: { $regex: `^${escapeRegex(value)}$`, $options: 'i' } };
}

router.get('/', async (req, res, next) => {
  try {
    const {
      category,
      company,
      measurement,
      vehicleType,
      vehicleNumber,
      units,
      dateFrom,
      dateTo,
    } = req.query;
    const clauses = [];

    for (const [field, value] of [
      ['category', category],
      ['company', company],
      ['measurement', measurement],
      ['vehicleType', vehicleType],
    ]) {
      if (value !== undefined && typeof value !== 'string') {
        return res.status(400).json({ message: 'Filters must be text values.' });
      }
      const clause = exactMatch(field, value?.trim());
      if (clause) clauses.push(clause);
    }

    if (vehicleNumber !== undefined) {
      if (typeof vehicleNumber !== 'string') {
        return res.status(400).json({ message: 'Vehicle number filter must be text.' });
      }
      if (vehicleNumber.trim()) {
        clauses.push({ vehicleNumber: { $regex: escapeRegex(vehicleNumber.trim()), $options: 'i' } });
      }
    }

    if (units !== undefined && units !== '') {
      const unitsValue = Number(units);
      if (!Number.isSafeInteger(unitsValue) || unitsValue < 1) {
        return res.status(400).json({ message: 'Units filter must be a positive whole number.' });
      }
      clauses.push({ units: unitsValue });
    }

    if (dateFrom && !isIsoDate(dateFrom)) {
      return res.status(400).json({ message: 'Start date must be a valid date.' });
    }
    if (dateTo && !isIsoDate(dateTo)) {
      return res.status(400).json({ message: 'End date must be a valid date.' });
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return res.status(400).json({ message: 'Start date must be on or before end date.' });
    }
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
      clauses.push({ dateOfLoad: dateFilter });
    }

    const filter = clauses.length ? { $and: clauses } : {};
    const items = await TransportMovement.find(filter).sort({ dateOfLoad: -1, createdAt: -1 }).lean();
    return res.json({
      items: items.map(({ _id, __v, ...item }) => ({ ...item, id: _id.toString() })),
      total: items.length,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      category,
      company,
      measurement,
      dateOfLoad,
      vehicleType,
      vehicleNumber,
      units,
    } = req.body || {};
    const textFields = { category, company, measurement, vehicleType, vehicleNumber };

    if (Object.values(textFields).some((value) => typeof value !== 'string' || !value.trim())) {
      return res.status(400).json({ message: 'Category, Company, Measurement, Vehicle type, and Vehicle number are required.' });
    }
    if (!isIsoDate(dateOfLoad)) {
      return res.status(400).json({ message: 'Date of load must be a valid date.' });
    }
    if (!Number.isSafeInteger(units) || units < 1) {
      return res.status(400).json({ message: 'No. of Units must be a positive whole number.' });
    }

    const item = await TransportMovement.create({
      ...Object.fromEntries(Object.entries(textFields).map(([key, value]) => [key, value.trim()])),
      dateOfLoad,
      units,
    });
    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
});

export default router;
