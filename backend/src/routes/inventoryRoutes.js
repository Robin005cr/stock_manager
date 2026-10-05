import { Router } from 'express';
import { InventoryItem } from '../models/InventoryItem.js';
import { MetadataOption } from '../models/MetadataOption.js';
import { buildInventoryQuery } from '../utils/inventoryQuery.js';
import { metadataValueSignature, normalizeMetadataValue } from '../utils/metadataValidation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
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
      createdAt: item.createdAt,
      stockHistory: item.stockHistory || [],
    }));

    res.json({ items: results, total: results.length });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
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
      stockHistory: [{ type: 'load', change: qty, quantityAfter: qty, changedAt: new Date() }],
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-update', requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'The spreadsheet does not contain any product rows.' });
    }

    const allowedKeys = new Set([
      'rowNumber',
      'measurement',
      'productName',
      'productCode',
      'company',
      'category',
      'quantity',
      'godown',
      'dateOfLoad',
    ]);
    const skipped = [];
    const candidates = [];
    const seenCodes = new Set();

    rows.forEach((row, index) => {
      const rowNumber = Number.isInteger(row?.rowNumber) && row.rowNumber >= 2 ? row.rowNumber : index + 2;
      const skip = (message) => skipped.push({ rowNumber, message });

      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        skip('Invalid row data.');
        return;
      }

      if (Object.keys(row).some((key) => !allowedKeys.has(key))) {
        skip('Unexpected data found in this row.');
        return;
      }

      const textFields = ['productName', 'productCode', 'company', 'category'];
      if (textFields.some((field) => typeof row[field] !== 'string' || !row[field].trim())) {
        skip('Product Name, Product Code, Company, and Category are required.');
        return;
      }

      const productCode = row.productCode.trim();
      if (seenCodes.has(productCode)) {
        skip('Product Code appears more than once in the spreadsheet.');
        return;
      }
      seenCodes.add(productCode);

      const quantityText = typeof row.quantity === 'string' ? row.quantity.trim() : row.quantity;
      const quantity = typeof quantityText === 'number' ? quantityText : Number(quantityText);
      if (
        !['number', 'string'].includes(typeof quantityText) ||
        (typeof quantityText === 'string' && !/^\d+$/.test(quantityText)) ||
        !Number.isSafeInteger(quantity) ||
        quantity < 0
      ) {
        skip('Quantity must be a non-negative whole number.');
        return;
      }

      const optionalTextFields = ['measurement', 'godown', 'dateOfLoad'];
      if (optionalTextFields.some((field) => row[field] !== undefined && typeof row[field] !== 'string')) {
        skip('Unexpected data found in this row.');
        return;
      }

      const dateOfLoad = (row.dateOfLoad || '').trim();
      let normalizedDate = '';
      if (dateOfLoad) {
        const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfLoad);
        const textDate = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateOfLoad);
        const parts = isoDate
          ? [Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3])]
          : textDate
            ? [Number(textDate[3]), Number(textDate[2]), Number(textDate[1])]
            : null;
        const parsedDate = parts ? new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])) : null;
        if (
          !parsedDate ||
          parsedDate.getUTCFullYear() !== parts[0] ||
          parsedDate.getUTCMonth() + 1 !== parts[1] ||
          parsedDate.getUTCDate() !== parts[2]
        ) {
          skip('Date of Load must be a valid date in dd-mm-yyyy or yyyy-mm-dd format.');
          return;
        }
        normalizedDate = parsedDate.toISOString().slice(0, 10);
      }

      candidates.push({
        rowNumber,
        measurement: normalizeMetadataValue(row.measurement),
        productName: row.productName.trim(),
        productCode,
        company: normalizeMetadataValue(row.company),
        category: normalizeMetadataValue(row.category),
        quantity,
        godown: (row.godown || '').trim(),
        dateOfLoad: normalizedDate,
      });
    });

    if (candidates.length === 0) {
      return res.json({ updated: 0, skipped });
    }

    const productCodes = candidates.map(({ productCode }) => productCode);
    const [products, metadataOptions, measurements, companies, categories] = await Promise.all([
      InventoryItem.find({ productCode: { $in: productCodes } })
        .select('_id productCode quantity')
        .lean(),
      MetadataOption.find({ kind: { $in: ['measurement', 'company', 'category'] } })
        .select('kind value')
        .lean(),
      InventoryItem.distinct('measurement'),
      InventoryItem.distinct('company'),
      InventoryItem.distinct('category'),
    ]);

    const allowedMetadata = {
      measurement: new Map((defaultMetadata.measurements || []).map((value) => [metadataValueSignature(value), value])),
      company: new Map((defaultMetadata.companies || []).map((value) => [metadataValueSignature(value), value])),
      category: new Map((defaultMetadata.categories || []).map((value) => [metadataValueSignature(value), value])),
    };
    metadataOptions.forEach(({ kind, value }) => {
      allowedMetadata[kind]?.set(metadataValueSignature(value), value);
    });
    [
      ['measurement', measurements],
      ['company', companies],
      ['category', categories],
    ].forEach(([kind, values]) => {
      values.forEach((value) => {
        if (value) allowedMetadata[kind].set(metadataValueSignature(value), value);
      });
    });

    const productsByCode = new Map();
    products.forEach((product) => {
      const matches = productsByCode.get(product.productCode) || [];
      matches.push(product);
      productsByCode.set(product.productCode, matches);
    });

    let updated = 0;
    for (const row of candidates) {
      const matches = productsByCode.get(row.productCode) || [];
      if (matches.length === 0) {
        skipped.push({ rowNumber: row.rowNumber, message: 'No existing product has this Product Code; new products are not added.' });
        continue;
      }
      if (matches.length > 1) {
        skipped.push({ rowNumber: row.rowNumber, message: 'Product Code is not unique in the database.' });
        continue;
      }

      const canonicalMetadata = {};
      let invalidMetadata = false;
      for (const kind of ['measurement', 'company', 'category']) {
        const value = row[kind];
        if (!value && kind === 'measurement') {
          canonicalMetadata[kind] = '';
          continue;
        }
        const canonicalValue = allowedMetadata[kind].get(metadataValueSignature(value));
        if (!canonicalValue) {
          skipped.push({ rowNumber: row.rowNumber, message: `Unknown ${kind}; add it in Add meta details before importing.` });
          invalidMetadata = true;
          break;
        }
        canonicalMetadata[kind] = canonicalValue;
      }
      if (invalidMetadata) continue;

      const currentProduct = matches[0];
      const change = row.quantity - currentProduct.quantity;
      const update = {
        measurement: canonicalMetadata.measurement,
        productName: row.productName,
        company: canonicalMetadata.company,
        category: canonicalMetadata.category,
        quantity: row.quantity,
        godown: row.godown,
        dateOfLoad: row.dateOfLoad,
      };
      if (change !== 0) {
        update.$push = {
          stockHistory: { type: 'edit', change, quantityAfter: row.quantity, changedAt: new Date() },
        };
      }

      const updatedProduct = await InventoryItem.findByIdAndUpdate(
        currentProduct._id,
        update,
        { new: true, runValidators: true },
      );
      if (!updatedProduct) {
        skipped.push({ rowNumber: row.rowNumber, message: 'Product no longer exists in the database.' });
        continue;
      }
      updated += 1;
    }

    return res.json({ updated, skipped });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { measurement, productName, productCode, productImage, company, category, quantity, godown, dateOfLoad } = req.body;

    if (!productName?.trim() || !company?.trim() || !category?.trim()) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ message: 'Quantity must be a non-negative integer.' });
    }

    const existingItem = await InventoryItem.findById(req.params.id).select('quantity');
    if (!existingItem) return res.status(404).json({ message: 'Inventory item not found.' });

    const change = qty - existingItem.quantity;
    const update = {
      measurement: measurement?.trim() || '',
      productName: productName.trim(),
      productCode: typeof productCode === 'string' ? productCode.trim() : String(productCode ?? '').trim(),
      productImage: typeof productImage === 'string' ? productImage.trim() : '',
      company: company.trim(),
      category: category.trim(),
      quantity: qty,
      godown: typeof godown === 'string' ? godown.trim() : '',
      dateOfLoad: dateOfLoad || '',
    };
    if (change !== 0) {
      update.$push = {
        stockHistory: { type: 'edit', change, quantityAfter: qty, changedAt: new Date() },
      };
    }

    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true },
    );

    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/stock', requireRole('admin'), async (req, res, next) => {
  try {
    const { direction, amount } = req.body;
    if (direction !== 'increment' && direction !== 'decrement') {
      return res.status(400).json({ message: 'Stock direction must be increment or decrement.' });
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive whole number.' });
    }

    const isDecrement = direction === 'decrement';
    const item = await InventoryItem.findOneAndUpdate(
      isDecrement
        ? { _id: req.params.id, quantity: { $gte: amount } }
        : { _id: req.params.id },
      {
        $inc: { quantity: isDecrement ? -amount : amount },
        $push: {
          stockHistory: {
            type: 'adjustment',
            change: isDecrement ? -amount : amount,
            changedAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true },
    );

    if (!item) {
      const existingItem = await InventoryItem.findById(req.params.id).select('_id').lean();
      if (!existingItem) return res.status(404).json({ message: 'Inventory item not found.' });
      return res.status(400).json({ message: 'The stock will be negative operation not possible' });
    }

    res.json({ id: item._id.toString(), quantity: item.quantity });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });
    res.json({ message: 'Inventory item deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
