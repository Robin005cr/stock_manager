import mongoose from 'mongoose';

const stockBookingSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    daysToHold: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['held', 'released', 'expired'], default: 'held' },
    releasedAt: { type: Date },
  },
  { timestamps: true },
);

stockBookingSchema.index({ product: 1, status: 1, expiresAt: 1 });
stockBookingSchema.index({ createdAt: -1 });

export const StockBooking = mongoose.model('StockBooking', stockBookingSchema);
