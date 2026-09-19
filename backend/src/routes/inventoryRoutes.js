import { Router } from 'express';
import { InventoryItem } from '../models/InventoryItem.js';
import { MetadataOption } from '../models/MetadataOption.js';
import { buildInventoryQuery } from '../utils/inventoryQuery.js';
import { requireAuth } from '../middleware/auth.js';
import defaultMetadata from '../data/defaultMetadata.json' with { type: 'json' };

const router = Router();

router.use(requireAuth);

router.get('/filter-options', async (_req, res, next) => {
  try {
    const [measurements, companies, categories, quantities, godowns, metadataEntries] = await Promise.all([
      InventoryItem.distinct('measurement'),
      InventoryItem.distinct('company'),
      InventoryItem.distinct('category'),
      InventoryItem.distinct('quantity'),
      InventoryItem.distinct('godown'),
      MetadataOption.find({ kind: { $in: ['measurement', 'company', 'category'] } }).select('kind value').lean(),
    ]);

    const metadataByKind = {
      measurement: new Set(),
      company: new Set(),
      category: new Set(),
    };

    metadataEntries.forEach(({ kind, value }) => {
      if (value) metadataByKind[kind]?.add(value);
    });

    const seededMeasurements = [...new Set([...(metadataByKind.measurement || []), ...measurements.filter(Boolean)])].sort();
    const seededCompanies = [...new Set([...(defaultMetadata.companies || []), ...(metadataByKind.company || []), ...companies.filter(Boolean)])].sort();
    const seededCategories = [...new Set([...(defaultMetadata.categories || []), ...(metadataByKind.category || []), ...categories.filter(Boolean)])].sort();

    res.json({
      measurements: seededMeasurements,
      companies: seededCompanies,
      categories: seededCategories,
      quantities: quantities.sort((a, b) => a - b),
      godowns: godowns.filter(Boolean).sort(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const filter = buildInventoryQuery({
      searchTerm: req.query.searchTerm,
      measurement: req.query.measurement,
      company: req.query.company,
      category: req.query.category,
      quantity: req.query.quantity,
      godown: req.query.godown,
      date: req.query.date,
    });

    const items = await InventoryItem.find(filter).sort({ updatedAt: -1 }).lean();
    const results = items.map((item) => ({
      id: item._id.toString(),
      measurement: item.measurement,
      productName: item.productName,
      productCode: item.productCode,
      productImage: item.productImage,
      company: item.company,
      category: item.category,
      quantity: item.quantity,
      godown: item.godown,
      dateOfLoad: item.dateOfLoad,
    }));

    res.json({ items: results, total: results.length });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { measurement, productName, productCode, productImage, company, category, quantity, godown, dateOfLoad } = req.body;

    if (!productName?.trim() || !company?.trim() || !category?.trim()) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ message: 'Quantity must be a non-negative integer.' });
    }

    const item = await InventoryItem.create({
      measurement: measurement?.trim() || '',
      productName: productName.trim(),
      productCode: typeof productCode === 'string' ? productCode.trim() : String(productCode ?? '').trim(),
      productImage: typeof productImage === 'string' ? productImage.trim() : '',
      company: company.trim(),
      category: category.trim(),
      quantity: qty,
      godown: typeof godown === 'string' ? godown.trim() : '',
      dateOfLoad: dateOfLoad || '',
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

export default router;
