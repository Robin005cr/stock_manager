import { Router } from 'express';
import { MetadataOption } from '../models/MetadataOption.js';
import { requireAuth } from '../middleware/auth.js';
import { isDuplicateMetadataValue, metadataValueSignature, normalizeMetadataValue } from '../utils/metadataValidation.js';

const router = Router();

router.use(requireAuth);

function buildInvalidMessage(kind) {
  return `This ${kind.slice(0, 1).toUpperCase() + kind.slice(1)} already exists.`;
}

router.get('/:kind', async (req, res, next) => {
  try {
    const kind = String(req.params.kind || '').toLowerCase();
    if (!['category', 'company', 'measurement'].includes(kind)) {
      return res.status(400).json({ message: 'Unsupported metadata type.' });
    }

    const items = await MetadataOption.find({ kind }).sort({ value: 1 }).lean();
    return res.json(items.map((item) => ({ id: item._id.toString(), value: item.value })));
  } catch (error) {
    return next(error);
  }
});

router.post('/:kind', async (req, res, next) => {
  try {
    const kind = String(req.params.kind || '').toLowerCase();
    const rawValue = normalizeMetadataValue(req.body?.value);

    if (!['category', 'company', 'measurement'].includes(kind)) {
      return res.status(400).json({ message: 'Unsupported metadata type.' });
    }

    if (!rawValue) {
      return res.status(400).json({ message: 'Value is required.' });
    }

    const exists = await MetadataOption.findOne({ kind, normalizedValue: metadataValueSignature(rawValue) });
    if (exists) {
      return res.status(409).json({ message: buildInvalidMessage(kind) });
    }

    const created = await MetadataOption.create({
      kind,
      value: rawValue,
      normalizedValue: metadataValueSignature(rawValue),
    });

    return res.status(201).json({ id: created._id.toString(), value: created.value });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: buildInvalidMessage(String(req.params.kind || '').toLowerCase()) });
    }
    return next(error);
  }
});

router.put('/:kind/:id', async (req, res, next) => {
  try {
    const kind = String(req.params.kind || '').toLowerCase();
    const rawValue = normalizeMetadataValue(req.body?.value);

    if (!['category', 'company', 'measurement'].includes(kind)) {
      return res.status(400).json({ message: 'Unsupported metadata type.' });
    }

    if (!rawValue) {
      return res.status(400).json({ message: 'Value is required.' });
    }

    const existing = await MetadataOption.findOne({
      kind,
      normalizedValue: metadataValueSignature(rawValue),
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(409).json({ message: buildInvalidMessage(kind) });
    }

    const updated = await MetadataOption.findByIdAndUpdate(
      req.params.id,
      {
        value: rawValue,
        normalizedValue: metadataValueSignature(rawValue),
      },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ message: 'Metadata item not found.' });
    }

    return res.json({ id: updated._id.toString(), value: updated.value });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: buildInvalidMessage(kind) });
    }
    return next(error);
  }
});

router.delete('/:kind/:id', async (req, res, next) => {
  try {
    const kind = String(req.params.kind || '').toLowerCase();
    if (!['category', 'company', 'measurement'].includes(kind)) {
      return res.status(400).json({ message: 'Unsupported metadata type.' });
    }

    const deleted = await MetadataOption.findOneAndDelete({ _id: req.params.id, kind });
    if (!deleted) {
      return res.status(404).json({ message: 'Metadata item not found.' });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
