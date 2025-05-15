const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Doctor=require("../models/doctorModel");

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password");
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({ name, email, password });

  if (user) {
    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: user.getSignedJwtToken(),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email and password
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  // Find user by email and select the password field
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  // Generate JWT token with user id and role
  const token = user.getSignedJwtToken();

  // Set token in cookie
  res.cookie("authToken", token, {
    httpOnly: true,  // Make the cookie accessible only by HTTP requests
    secure: process.env.NODE_ENV === "production",  // Secure cookie only in production
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Set for cross-origin requests
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days expiration for the cookie
  });

  // Respond with success message and user info (excluding password)
  res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});


// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error("Not authorized, user missing");
  }

  // Fetch user based on role (doctor, patient, or admin)
  let user;

  if (req.user.role === "doctor") {
    user = await Doctor.findById(req.user.id).select("-password");
  } else if (req.user.role === "patient") {
    user = await User.findById(req.user._id).select("-password"); // Assuming User is the patient model
  } else {
    // Admins can also access this route, but you can adjust based on your needs
    user = await User.findById(req.user._id).select("-password");
  }

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  console.log("Authenticated User:", req.user); // Logging for debugging purposes

  res.status(200).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});




module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
