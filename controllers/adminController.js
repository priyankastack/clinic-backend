const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

// @desc    Auth admin & get token
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    res.status(400);
    throw new Error("Please provide email");
  }

  // Find the admin by email
  const admin = await User.findOne({ email });

  if (!admin) {
    console.log("Admin not found with the provided email:", email);
    res.status(401);
    throw new Error("Invalid email");
  }

  if (admin.role === "admin") {
    // If user is an admin, return token and user details
    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: admin.getSignedJwtToken(), // Assuming this exists in your User model
    });
  } else {
    console.log("User is not an admin");
    res.status(401);
    throw new Error("Not authorized as admin");
  }
});



// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private (Admin only)


const getAdminProfile = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(401);
    throw new Error('Not authorized as admin');
  }

  res.status(200).json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
});

module.exports = { getAdminProfile };


module.exports = {loginAdmin,getAdminProfile};