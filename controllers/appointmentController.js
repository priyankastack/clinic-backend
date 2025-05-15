const asyncHandler = require("express-async-handler")
const Appointment = require("../models/appointmentModel")
const Doctor = require("../models/doctorModel")


// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
const getAppointments = asyncHandler(async (req, res) => {
  // If admin, get all appointments, otherwise get only user's appointments
  const filter = req.user.role === "admin" ? {} : { patient: req.user._id }

  const appointments = await Appointment.find(filter)
    .populate("doctor", "name specialty")
    .populate("patient", "name email phone")

  res.json(appointments)
})

// @desc    Get appointment by ID//
// @route   GET /api/appointments/:id
// @access  Private

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patient: req.user._id })
    .populate('doctor', 'name specialty')
    .populate('patient', 'name email');

  if (appointments.length === 0) {
    res.status(404);
    throw new Error('No appointments found');
  }

  res.json(appointments);
});

// @desc    Create a new appointment
// @route   POST /api/appointments
// @access  Private
const createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, date, timeSlot, patientName, patientEmail, patientPhone } = req.body;

  // Validate required fields
  if (!doctorId || !date || !timeSlot || !patientName || !patientEmail || !patientPhone) {
    res.status(400);
    throw new Error("Missing required fields for appointment");
  }

  // Check if doctor exists
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    res.status(404); // 404 = not found
    throw new Error("Doctor not found");
  }

  // Check if the appointment date is valid
  const appointmentDate = new Date(date);
  if (isNaN(appointmentDate.getTime())) { // More precise check for invalid date
    res.status(400);
    throw new Error("Invalid appointment date");
  }

  // Check if the time slot is available on the selected date
  try {
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: {
        $gte: new Date(appointmentDate.setHours(0, 0, 0)), // Normalize to start of the day
        $lt: new Date(appointmentDate.setHours(23, 59, 59)), // Normalize to end of the day
      },
      timeSlot,
    });

    if (existingAppointment) {
      res.status(400);
      throw new Error("This time slot is already booked");
    }

    // Create appointment
    const appointment = await Appointment.create({
      doctor: doctorId,
      patient: req.user._id,
      date,
      timeSlot,
      patientName,
      patientEmail,
      patientPhone,
    });

    if (appointment) {
      res.status(201).json(appointment);
    } else {
      res.status(400);
      throw new Error("Invalid appointment data");
    }
  } catch (error) {
    console.error("Error while booking appointment:", error);
    res.status(500); // Server Error
    throw new Error("Internal server error while booking appointment");
  }
});


// @desc    Cancel an appointment
// @route   DELETE /api/appointments/:id
// @access  Private
const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)

  if (!appointment) {
    res.status(404)
    throw new Error("Appointment not found")
  }

  // Make sure the logged in user is the appointment owner or an admin
  if (appointment.patient.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(401)
    throw new Error("Not authorized to cancel this appointment")
  }

  await appointment.deleteOne()
  res.json({ message: "Appointment cancelled" })
})

// @desc    Get available time slots for a doctor on a specific date
// @route   GET /api/appointments/available/:doctorId/:date
// @access  Private
const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.params

  // Define all possible time slots
  const allTimeSlots = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
  ]

  // Check if doctor exists
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) {
    res.status(400)
    throw new Error("Doctor not found")
  }



  // Find booked slots for the selected doctor and date
  const appointmentDate = new Date(date)
  const bookedAppointments = await Appointment.find({
    doctor: doctorId,
    date: {
      $gte: new Date(appointmentDate.setHours(0, 0, 0)),
      $lt: new Date(appointmentDate.setHours(23, 59, 59)),
    },
  })

  const bookedTimeSlots = bookedAppointments.map((app) => app.timeSlot)

  // Filter out booked slots
  const availableTimeSlots = allTimeSlots.filter((slot) => !bookedTimeSlots.includes(slot))

  res.json(availableTimeSlots)
})


const getDoctorAppointments = async (req, res) => {
  console.log("Doctor appointments route hit");
  console.log("🩺 Authenticated doctor (req.user):", req.user);

  if (!req.user || !req.user._id) {
    console.error(" req.user or req.user._id missing!");
    return res.status(401).json({ message: "Unauthorized: No doctor info" });
  }

  const doctorId = req.user._id.toString();
  console.log(" Fetching appointments for doctor ID:", doctorId);

  try {
    const appointments = await Appointment.find({ doctor: doctorId }).populate("patient");
    console.log(` Found ${appointments.length} appointments`);

    return res.status(200).json(appointments);
  } catch (error) {
    console.error(" Error fetching doctor appointments:", error);
    return res.status(500).json({ message: "Server error fetching appointments" });
  }
};

// Update appointment status (doctor only)
const updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Only allow the doctor assigned to this appointment to update it
    if (appointment.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this appointment.' });
    }

    appointment.status = status;
    await appointment.save();

    res.status(200).json({ message: 'Appointment status updated successfully.', appointment });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ message: 'Server error while updating appointment status.' });
  }
};


// controllers/appointmentController.js
const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { date, timeSlot } = req.body;
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }

  appointment.date = date;
  appointment.timeSlot = timeSlot;
  appointment.status = "rescheduled";

  const updated = await appointment.save();
  res.json(updated);
});



module.exports = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  cancelAppointment,
  getAvailableTimeSlots,
  getDoctorAppointments,
  updateAppointmentStatus,
  rescheduleAppointment,
}
