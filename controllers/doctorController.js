const asyncHandler = require("express-async-handler")
const Doctor = require("../models/doctorModel")
const sendDoctorCredentialsEmail  = require("../utils/email");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const expressAsyncHandler = require("express-async-handler");


// @desc    Auth doctor & get token
// @route   POST /api/doctors/login
// @access  Public
const loginDoctor = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt with email:", email);

  // Validate input
  if (!email || !password) {
    console.log("Missing email or password");
    return res.status(400).json({ message: "Please provide email and password" });
  }

  // Find doctor by email
  const doctor = await Doctor.findOne({ email });
  if (!doctor) {
    console.log("Doctor not found");
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check if the doctor has the correct role
  if (doctor.role !== "doctor") {
    console.log("Role is not doctor:", doctor.role);
    return res.status(401).json({ message: "Not authorized as doctor" });
  }

  // Log the hashed password stored in the database
  console.log("Stored hashed password:", doctor.password);
  console.log("Entered password:", password);

  // Compare entered password with the stored hashed password
  const isPasswordMatch = await bcrypt.compare(password, doctor.password);
  console.log("Password match:", isPasswordMatch);

  // If passwords don't match, return error
  if (!isPasswordMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Generate JWT token for the doctor
  const token = jwt.sign(
    { id: doctor._id, role: doctor.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  console.log("Token generated:", token);

  // Set token in cookies
  res.cookie("authToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  console.log("Cookie set with authToken");

  // Return response with doctor details and success message
  res.status(200).json({
    success: true,
    message: "Doctor login successful",
    user: {
      id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
    },
  });
});

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
const getDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({})
  res.json(doctors)
})

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)

  if (doctor) {
    res.json(doctor)
  } else {
    res.status(404)
    throw new Error("Doctor not found")
  }
})

// @desc    Create a doctor
// @route   POST /api/doctors
// @access  Private/Admin
const createDoctor = async (req, res) => {
  try {
    const { name, specialty, email, password } = req.body;

    // Validate inputs
    if (!name || !specialty || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if the doctor already exists
    const doctorExists = await Doctor.findOne({ email });
    if (doctorExists) {
      return res.status(400).json({ message: "Doctor with this email already exists" });
    }

    // Hash the password manually (in case it wasn't hashed in the pre-save hook)
    /*const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the doctor with the hashed password
    const doctor = await Doctor.create({
      name,
      specialty,
      email,
      password: hashedPassword, // Use the hashed password here
    });*/

     const doctor = await Doctor.create({
      name,
      specialty,
      email,
      password, // Use the hashed password here
      role,
    });

    // You can generate the reset token for the initial setup (optional)
    const resetToken = jwt.sign(
      { doctorId: doctor._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Save the reset token and expiry if you want to handle initial password setup
    doctor.resetPasswordToken = resetToken;
    doctor.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry

    // Save the doctor with the reset token and expiry
    await doctor.save();

    // Send email with the reset password link (if applicable)
    try {
      await sendDoctorCredentialsEmail(doctor.email, resetToken, doctor.name);
    } catch (emailError) {
      console.error("Failed to send email:", emailError.message);
      // Continue even if email fails
    }

    // Return the newly created doctor (without password field)
    return res.status(201).json({
      name: doctor.name,
      email: doctor.email,
      specialty: doctor.specialty,
      role: doctor.role,
      message: "Doctor created successfully. A reset password link has been sent to the provided email.",
    });

  } catch (err) {
    console.error("Error in createDoctor:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};



// @desc    Update a doctor
// @route   PATCH /api/doctors/:id
// @access  Private/Admin
const updateDoctor = asyncHandler(async (req, res) => {
  try {
    const { name, specialty } = req.body;

    // Find the doctor by ID
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Update the doctor's information
    doctor.name = name || doctor.name;
    doctor.specialty = specialty || doctor.specialty;

    const updatedDoctor = await doctor.save();
    res.json(updatedDoctor);
  } catch (error) {
    console.error("Error updating doctor:", error); // Log the error for debugging
    res.status(500).json({
      message: error.message || "An unexpected error occurred while updating the doctor.",
    });
  }
});

// @desc    Delete a doctor
// @route   DELETE /api/doctors/:id
// @access  Private/Admin
const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)

  if (doctor) {
    await doctor.deleteOne()
    res.json({ message: "Doctor removed" })
  } else {
    res.status(404)
    throw new Error("Doctor not found")
  }
})



const resetPassword = async (req, res) => {
  try {
    console.log(" Reset password endpoint called");
    console.log("Token from params:", req.params.token);
    console.log("New password from body:", req.body.newPassword);

    let decodedToken;
    try {
      decodedToken = jwt.verify(req.params.token, process.env.JWT_SECRET);
      console.log("Token decoded:", decodedToken);
    } catch (err) {
      console.log(" Token verification failed:", err.message);
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const doctor = await Doctor.findById(decodedToken.doctorId);
    if (!doctor) {
      console.log(" Doctor not found with ID:", decodedToken.doctorId);
      return res.status(404).json({ message: "Doctor not found" });
    }
    console.log(" Doctor found:", doctor.email);

    if (Date.now() > doctor.resetPasswordExpires) {
      console.log(" Token expired. Now:", Date.now(), "Expires:", doctor.resetPasswordExpires);
      return res.status(400).json({ message: "Password reset link has expired" });
    }

    const { newPassword } = req.body;

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      console.log(" Password validation failed");
      return res.status(400).json({
        message: "Password must contain at least 1 uppercase letter, 1 number, and 1 special character, and be at least 6 characters long",
      });
    }
    console.log(" Password passed validation");

    /*const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);*/

  
    doctor.password = newPassword; 
    doctor.resetPasswordToken = undefined;
    doctor.resetPasswordExpires = undefined;
    await doctor.save();

    console.log("Password reset successfully for doctor:", doctor.email);
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(" Reset error:", err);
    res.status(500).json({ message: err.message || "Something went wrong" });
  }
};







module.exports = {
  resetPassword,
  loginDoctor,
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
 
  
}
