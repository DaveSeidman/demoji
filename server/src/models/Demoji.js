import mongoose from 'mongoose';

const demojiSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 280,
      default: ''
    },
    styleSet: {
      type: String,
      enum: ['standard', 'apple', 'google', 'microsoft', 'samsung', 'twitter', 'unicode'],
      default: 'standard'
    },
    imageUrl: {
      type: String,
      required: true
    },
    generationModel: {
      type: String,
      default: ''
    },
    votes: {
      type: Number,
      default: 0,
      min: 0
    },
    voteFingerprints: {
      type: [String],
      default: [],
      select: false
    },
    status: {
      type: String,
      enum: ['generated', 'flagged'],
      default: 'generated'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.voteFingerprints;
        delete ret.__v;
        return ret;
      }
    }
  }
);

demojiSchema.index({ prompt: 'text', description: 'text' });

export const Demoji = mongoose.model('Demoji', demojiSchema);
