import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { StockBooking } from '../models/StockBooking.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', async (_req, res, next) => {
  try {
    const now = new Date();
    const bookings = await StockBooking.find().sort({ createdAt: -1 }).lean();
    res.json({
      items: bookings.map(({ _id, __v, ...booking }) => ({
        ...booking,
        id: _id.toString(),
        reservedQuantity: booking.reservedQuantity ?? booking.quantity,
        deficientQuantity: booking.quantity - (booking.reservedQuantity ?? booking.quantity),
        status: booking.status === 'held' && booking.expiresAt <= now ? 'expired' : booking.status,
      })),
      total: bookings.length,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { customerName, customerPhone, daysToHold } = req.body || {};
    if (
      typeof customerName !== 'string' ||
      !customerName.trim() ||
      typeof customerPhone !== 'string' ||
      !customerPhone.trim()
    ) {
      return res.status(400).json({ message: 'Customer name and phone number are required.' });
    }
    if (customerName.trim().length > 120 || customerPhone.trim().length > 40) {
      return res.status(400).json({ message: 'Customer name or phone number is too long.' });
    }
    if (req.body?.items !== undefined && !Array.isArray(req.body.items)) {
      return res.status(400).json({ message: 'Booking items must be provided as a list.' });
    }
    const requestedItems = Array.isArray(req.body?.items)
      ? req.body.items
      : [{ productId: req.body?.productId, quantity: req.body?.quantity }];
    if (requestedItems.length < 1) {
      return res.status(400).json({ message: 'Add at least one product to a booking.' });
    }
    if (!Number.isSafeInteger(daysToHold) || daysToHold < 1 || daysToHold > 60) {
      return res.status(400).json({ message: 'Days to hold must be a whole number from 1 to 60.' });
    }

    const quantitiesByProduct = new Map();
    for (const requestedItem of requestedItems) {
      const { productId, quantity } = requestedItem || {};
      if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: 'Select a valid product for every booking item.' });
      }
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: 'Every item quantity must be a positive whole number.' });
      }
      const id = productId.toString();
      const combinedQuantity = (quantitiesByProduct.get(id) || 0) + quantity;
      if (!Number.isSafeInteger(combinedQuantity)) {
        return res.status(400).json({ message: 'Combined product quantity is outside the supported range.' });
      }
      quantitiesByProduct.set(id, combinedQuantity);
    }

    const now = new Date();
    const productIds = [...quantitiesByProduct.keys()].map((id) => new mongoose.Types.ObjectId(id));
    const inventoryItems = await InventoryItem.find({ _id: { $in: productIds } })
      .select('productName quantity')
      .lean();
    const inventoryById = new Map(inventoryItems.map((item) => [item._id.toString(), item]));
    const missingProduct = [...quantitiesByProduct.keys()].find((id) => !inventoryById.has(id));
    if (missingProduct) return res.status(404).json({ message: 'One or more selected products were not found.' });

    const activeBookings = await StockBooking.find({
      product: { $in: productIds },
      status: 'held',
      expiresAt: { $gt: now },
    }).select('product quantity reservedQuantity').lean();
    const reservedByProduct = new Map();
    for (const booking of activeBookings) {
      const id = booking.product.toString();
      reservedByProduct.set(
        id,
        (reservedByProduct.get(id) || 0) + (booking.reservedQuantity ?? booking.quantity),
      );
    }

    const expiresAt = new Date(now.getTime() + daysToHold * 24 * 60 * 60 * 1000);
    if (!Number.isFinite(expiresAt.getTime())) {
      return res.status(400).json({ message: 'Days to hold is outside the supported range.' });
    }

    const bookingItems = [...quantitiesByProduct].map(([id, quantity]) => {
      const item = inventoryById.get(id);
      const availableQuantity = Math.max(0, item.quantity - (reservedByProduct.get(id) || 0));
      return {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        product: item._id,
        productName: item.productName,
        quantity,
        reservedQuantity: Math.min(quantity, availableQuantity),
        daysToHold,
        expiresAt,
      };
    });
    const bookings = await StockBooking.insertMany(bookingItems);
    return res.status(201).json({ items: bookings, total: bookings.length });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/release', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Stock booking not found.' });
    }
    const now = new Date();
    const booking = await StockBooking.findOneAndUpdate(
      { _id: req.params.id, status: 'held', expiresAt: { $gt: now } },
      { $set: { status: 'released', releasedAt: now } },
      { new: true },
    );

    if (!booking) {
      const expiredBooking = await StockBooking.findOneAndUpdate(
        { _id: req.params.id, status: 'held', expiresAt: { $lte: now } },
        { $set: { status: 'expired' } },
        { new: true },
      );
      if (expiredBooking) {
        return res.status(409).json({ message: 'This booking has expired and can no longer be released.' });
      }
      const exists = await StockBooking.exists({ _id: req.params.id });
      return exists
        ? res.status(409).json({ message: 'This booking is no longer active.' })
        : res.status(404).json({ message: 'Stock booking not found.' });
    }

    const quantityToRelease = booking.reservedQuantity ?? booking.quantity;
    if (quantityToRelease < 1) {
      await StockBooking.updateOne(
        { _id: booking._id, status: 'released' },
        { $set: { status: 'held' }, $unset: { releasedAt: 1 } },
      );
      return res.status(409).json({ message: 'No stock was reserved for this booking yet.' });
    }

    let item;
    try {
      item = await InventoryItem.findOneAndUpdate(
        { _id: booking.product, quantity: { $gte: quantityToRelease } },
        {
          $inc: { quantity: -quantityToRelease },
          $push: {
            stockHistory: {
              type: 'adjustment',
              change: -quantityToRelease,
              changedAt: now,
            },
          },
        },
        { new: true, runValidators: true },
      );
    } catch (error) {
      await StockBooking.updateOne(
        { _id: booking._id, status: 'released' },
        { $set: { status: 'held' }, $unset: { releasedAt: 1 } },
      );
      throw error;
    }

    if (!item) {
      await StockBooking.updateOne(
        { _id: booking._id, status: 'released' },
        { $set: { status: 'held' }, $unset: { releasedAt: 1 } },
      );
      const productExists = await InventoryItem.exists({ _id: booking.product });
      return productExists
        ? res.status(409).json({ message: 'There is not enough stock to complete this purchase.' })
        : res.status(409).json({ message: 'The booked product no longer exists in inventory.' });
    }

    return res.json({ booking, quantity: item.quantity });
  } catch (error) {
    return next(error);
  }
});

export default router;
