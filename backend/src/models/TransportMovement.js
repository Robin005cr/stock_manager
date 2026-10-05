import mongoose from 'mongoose';

const transportMovementSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    measurement: { type: String, required: true, trim: true },
    dateOfLoad: { type: String, required: true },
    vehicleType: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, trim: true },
    units: { type: Number, required: true, min: 1 },
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

transportMovementSchema.index({ dateOfLoad: -1, createdAt: -1 });

export const TransportMovement = mongoose.model('TransportMovement', transportMovementSchema);
