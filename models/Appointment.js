const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    date: {
      type: String, // YYYY-MM-DD or formatted date
      required: [true, 'Appointment date is required'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
    },
    jewelleryInterest: {
      type: String,
      enum: ['Bridal Sets', 'Diamond Jewellery', 'Gold Necklaces', 'Bangles & Kada', 'Solitaire Rings', 'Antique Temple Jewellery', 'Custom Bespoke Design', 'General Showroom Visit'],
      default: 'Bridal Sets',
    },
    consultationType: {
      type: String,
      enum: ['In-Showroom VIP Experience', 'Virtual Video Consultation'],
      default: 'In-Showroom VIP Experience',
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
