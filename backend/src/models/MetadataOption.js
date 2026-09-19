import mongoose from 'mongoose';

const metadataOptionSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['category', 'company', 'measurement'],
      required: true,
      trim: true,
      lowercase: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedValue: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
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

metadataOptionSchema.index({ kind: 1, normalizedValue: 1 }, { unique: true });

export const MetadataOption = mongoose.model('MetadataOption', metadataOptionSchema);
