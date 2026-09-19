import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    measurement: { type: String, default: '' },
    productName: { type: String, required: true, trim: true },
    productCode: { type: String, default: '' },
    productImage: { type: String, default: '' },
    company: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    godown: { type: String, default: '' },
    dateOfLoad: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
