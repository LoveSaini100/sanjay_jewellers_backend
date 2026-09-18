const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  public_id: {
    type: String,
    default: '',
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    collectionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      default: null,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      default: 0,
    },
    isPriceOnRequest: {
      type: Boolean,
      default: false,
    },
    goldPurity: {
      type: String,
      enum: ['14K', '18K', '22K', '24K', 'Platinum 950', '925 Silver', 'None'],
      default: '22K',
    },
    goldWeight: {
      type: String, // e.g., '14.50 grams'
      default: '',
    },
    stoneType: {
      type: String,
      enum: ['Diamond', 'Polki / Uncut Diamond', 'Kundan', 'Emerald', 'Ruby', 'Sapphire', 'Pearl', 'Zircon', 'None / Plain Gold'],
      default: 'None / Plain Gold',
    },
    stoneWeight: {
      type: String, // e.g., '1.20 carats'
      default: '',
    },
    stock: {
      type: Number,
      default: 1,
      min: 0,
    },
    availability: {
      type: String,
      enum: ['In Stock', 'Made to Order', 'Out of Stock'],
      default: 'In Stock',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    isBridal: {
      type: Boolean,
      default: false,
    },
    images: [imageSchema],
    seoTitle: {
      type: String,
      trim: true,
    },
    seoDescription: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for text search
productSchema.index({ name: 'text', description: 'text', sku: 'text' });

module.exports = mongoose.model('Product', productSchema);
