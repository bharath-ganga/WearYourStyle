import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

const generateAccessAndRefreshToken = async (user) => {
  try {
    const accessToken = User.generateAccessToken(user);
    const refreshToken = User.generateRefreshToken(user);

    // Save the refresh token in Postgres.
    await User.update(user.id, { refreshToken });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token");
  }
};

const validatePassword = (password) => {
  const minLength = 8;
  const maxLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[@#$%^&+=!]/.test(password);
  const noSpaces = !/\s/.test(password);
  const notCommon = !["password", "123456", "qwerty"].includes(password.toLowerCase());

  if (password.length < minLength || password.length > maxLength) return "Password must be 8-12 characters.";
  if (!hasUpperCase) return "Password must have at least one uppercase letter.";
  if (!hasLowerCase) return "Password must have at least one lowercase letter.";
  if (!hasNumber) return "Password must have at least one number.";
  if (!hasSpecialChar) return "Password must have at least one special character (@, #, $, %, etc.).";
  if (!noSpaces) return "Password should not contain spaces.";
  if (!notCommon) return "Password is too common.";

  return null;
};

const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, password, phoneNumber, address } = req.body;
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!firstName || !lastName || !email || !password || !phoneNumber) {
    throw new ApiError(400, "All fields (First Name, Last Name, Email, Password, and Phone) are mandatory");
  }

  if (!email.includes("@")) {
    throw new ApiError(400, "Invalid Email address");
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new ApiError(400, passwordError);
  }

  const existedUser = await User.findByEmail(email);
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const user = await User.create({
    firstName,
    lastName,
    password,
    email,
    phoneNumber,
    address: address || "",
    role: "customer",
  });

  if (!user) {
    throw new ApiError(500, "Something went wrong while registering a user");
  }

  const createdUser = User.sanitizeUser(user);

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findByEmail(email);

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await User.isPasswordCorrect(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

  const loggedInUser = User.sanitizeUser(user);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      token: accessToken,
      data: {
        user: loggedInUser,
      },
      message: "User Logged In successfully"
    });
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.update(req.user.id, { refreshToken: null });

  const options = { httpOnly: true, secure: true };

  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);

  return res.status(200).json(new ApiResponse(200, {}, "User Logged Out"));
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.getAll();
  const safeUsers = users.map(User.sanitizeUser);
  res.json(new ApiResponse(200, safeUsers, "Users fetched successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = User.sanitizeUser(req.user);
  // Ensure we have an addresses array for the frontend
  user.addresses = user.addresses || [];
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile fetched successfully"));
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const allowed = ["firstName", "lastName", "phoneNumber", "stylePreferences", "measurements"];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowed.includes(key))
  );
  const user = await User.update(req.user.id, updates);
  return res.status(200).json(new ApiResponse(200, { user: User.sanitizeUser(user) }, "Profile updated"));
});

const getWishlist = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.user.wishlist) ? req.user.wishlist : [];
  const products = (await Promise.all(ids.map((id) => Product.findById(id)))).filter(Boolean);
  return res.status(200).json(new ApiResponse(200, products, "Wishlist fetched"));
});

const addWishlistItem = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new ApiError(400, "Product ID is required");
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");
  const wishlist = [...new Set([...(req.user.wishlist || []), productId])];
  await User.update(req.user.id, { wishlist });
  return res.status(200).json(new ApiResponse(200, wishlist, "Added to wishlist"));
});

const removeWishlistItem = asyncHandler(async (req, res) => {
  const wishlist = (req.user.wishlist || []).filter((id) => id !== req.params.productId);
  await User.update(req.user.id, { wishlist });
  return res.status(200).json(new ApiResponse(200, wishlist, "Removed from wishlist"));
});

const addAddress = asyncHandler(async (req, res) => {
  const required = ["firstName", "lastName", "country", "street", "city", "state", "phone", "postal"];
  if (required.some((field) => !String(req.body[field] || "").trim())) {
    throw new ApiError(400, "Please complete all required address fields");
  }
  const address = { ...req.body, id: `addr-${Date.now()}`, isDefault: (req.user.addresses || []).length === 0 };
  const addresses = [...(req.user.addresses || []), address];
  await User.update(req.user.id, { addresses });
  return res.status(201).json(new ApiResponse(201, address, "Address saved"));
});

const removeAddress = asyncHandler(async (req, res) => {
  const addresses = (req.user.addresses || []).filter((address) => address.id !== req.params.id);
  await User.update(req.user.id, { addresses });
  return res.status(200).json(new ApiResponse(200, addresses, "Address removed"));
});

export { registerUser, loginUser, logoutUser, getAllUsers, getCurrentUser, updateCurrentUser, getWishlist, addWishlistItem, removeWishlistItem, addAddress, removeAddress };
