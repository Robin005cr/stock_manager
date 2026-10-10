import { StockBooking } from '../models/StockBooking.js';

export async function getActiveReservedQuantities(productIds, now = new Date()) {
  if (productIds.length === 0) return new Map();

  const reservations = await StockBooking.aggregate([
    {
      $match: {
        product: { $in: productIds },
        status: 'held',
        expiresAt: { $gt: now },
      },
    },
    {
      $group: {
        _id: '$product',
        quantity: { $sum: { $ifNull: ['$reservedQuantity', '$quantity'] } },
      },
    },
  ]);

  return new Map(reservations.map(({ _id, quantity }) => [_id.toString(), quantity]));
}
