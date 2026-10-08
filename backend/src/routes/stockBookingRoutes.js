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
    const { customerName, customerPhone, productId, quantity, daysToHold } = req.body || {};
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
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Select a valid product.' });
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be a positive whole number.' });
    }
    if (!Number.isSafeInteger(daysToHold) || daysToHold < 1) {
      return res.status(400).json({ message: 'Days to hold must be a positive whole number.' });
    }

    const item = await InventoryItem.findById(productId).select('productName quantity');
    if (!item) return res.status(404).json({ message: 'Product not found.' });

    const now = new Date();
    const activeBookings = await StockBooking.find({
      product: item._id,
      status: 'held',
      expiresAt: { $gt: now },
    }).select('quantity').lean();
    const reservedQuantity = activeBookings.reduce((total, booking) => total + booking.quantity, 0);
    if (quantity > item.quantity - reservedQuantity) {
      return res.status(400).json({
        message: `Only ${Math.max(0, item.quantity - reservedQuantity)} units are available to book.`,
      });
    }

    const expiresAt = new Date(now.getTime() + daysToHold * 24 * 60 * 60 * 1000);
    if (!Number.isFinite(expiresAt.getTime())) {
      return res.status(400).json({ message: 'Days to hold is outside the supported range.' });
    }

    const booking = await StockBooking.create({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      product: item._id,
      productName: item.productName,
      quantity,
      daysToHold,
      expiresAt,
    });
    return res.status(201).json(booking);
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

    let item;
    try {
      item = await InventoryItem.findOneAndUpdate(
        { _id: booking.product, quantity: { $gte: booking.quantity } },
        {
          $inc: { quantity: -booking.quantity },
          $push: {
            stockHistory: {
              type: 'adjustment',
              change: -booking.quantity,
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
