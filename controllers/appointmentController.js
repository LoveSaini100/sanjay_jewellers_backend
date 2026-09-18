const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');
const mockStore = require('../data/mockStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Book a new showroom/video appointment
// @route   POST /api/appointments
// @access  Public
exports.createAppointment = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      date,
      timeSlot,
      jewelleryInterest,
      consultationType,
      message,
    } = req.body;

    if (!name || !phone || !date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Name, Phone Number, Date, and Preferred Time Slot',
      });
    }

    if (isDbConnected()) {
      const appointment = await Appointment.create({
        name,
        phone,
        email: email || '',
        date,
        timeSlot,
        jewelleryInterest: jewelleryInterest || 'Bridal Sets',
        consultationType: consultationType || 'In-Showroom VIP Experience',
        message: message || '',
        status: 'Pending',
      });

      return res.status(201).json({
        success: true,
        message: 'Your appointment request has been scheduled. Our concierge will confirm your slot shortly.',
        appointment,
      });
    } else {
      const newAppointment = {
        _id: mockStore.generateId(),
        name,
        phone,
        email: email || '',
        date,
        timeSlot,
        jewelleryInterest: jewelleryInterest || 'Bridal Sets',
        consultationType: consultationType || 'In-Showroom VIP Experience',
        message: message || '',
        status: 'Pending',
        notes: '',
        createdAt: new Date().toISOString(),
      };
      const appointments = [newAppointment, ...mockStore.getAppointments()];
      mockStore.setAppointments(appointments);

      return res.status(201).json({
        success: true,
        message: 'Your appointment request has been scheduled. Our concierge will confirm your slot shortly.',
        appointment: newAppointment,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments (Admin)
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
  try {
    const { status, date, search, page = 1, limit = 20 } = req.query;

    if (isDbConnected()) {
      const query = {};
      if (status && status !== 'all') query.status = status;
      if (date) query.date = date;
      if (search && search.trim() !== '') {
        query.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { phone: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { jewelleryInterest: { $regex: search.trim(), $options: 'i' } },
        ];
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const total = await Appointment.countDocuments(query);
      const appointments = await Appointment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        appointments,
      });
    } else {
      let list = [...mockStore.getAppointments()];

      if (status && status !== 'all') {
        list = list.filter((a) => a.status === status);
      }
      if (date) {
        list = list.filter((a) => a.date === date);
      }
      if (search && search.trim() !== '') {
        const s = search.trim().toLowerCase();
        list = list.filter(
          (a) =>
            a.name.toLowerCase().includes(s) ||
            a.phone.toLowerCase().includes(s) ||
            (a.email && a.email.toLowerCase().includes(s)) ||
            (a.jewelleryInterest && a.jewelleryInterest.toLowerCase().includes(s))
        );
      }

      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;
      const paginated = list.slice(skip, skip + limitNum);

      return res.status(200).json({
        success: true,
        total: list.length,
        totalPages: Math.ceil(list.length / limitNum),
        currentPage: pageNum,
        appointments: paginated,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status & notes (Admin)
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res, next) => {
  try {
    const { status, notes, timeSlot, date } = req.body;

    if (isDbConnected()) {
      let appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

      if (status) appointment.status = status;
      if (notes !== undefined) appointment.notes = notes;
      if (timeSlot) appointment.timeSlot = timeSlot;
      if (date) appointment.date = date;

      await appointment.save();
      return res.status(200).json({ success: true, message: 'Appointment updated successfully', appointment });
    } else {
      const list = mockStore.getAppointments();
      const index = list.findIndex((a) => a._id === req.params.id);
      if (index === -1) return res.status(404).json({ success: false, message: 'Appointment not found' });

      const updated = {
        ...list[index],
        status: status || list[index].status,
        notes: notes !== undefined ? notes : list[index].notes,
        timeSlot: timeSlot || list[index].timeSlot,
        date: date || list[index].date,
        updatedAt: new Date().toISOString(),
      };
      list[index] = updated;
      mockStore.setAppointments(list);

      return res.status(200).json({ success: true, message: 'Appointment updated successfully', appointment: updated });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete appointment (Admin)
// @route   DELETE /api/appointments/:id
// @access  Private
exports.deleteAppointment = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const appointment = await Appointment.findByIdAndDelete(req.params.id);
      if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
      return res.status(200).json({ success: true, message: 'Appointment deleted successfully' });
    } else {
      let list = mockStore.getAppointments();
      const exists = list.some((a) => a._id === req.params.id);
      if (!exists) return res.status(404).json({ success: false, message: 'Appointment not found' });

      list = list.filter((a) => a._id !== req.params.id);
      mockStore.setAppointments(list);
      return res.status(200).json({ success: true, message: 'Appointment deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};
