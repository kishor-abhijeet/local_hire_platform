import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

function createToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function sendAuthResponse(res, user) {
  const token = createToken(user._id);
  const safeUser = user.toObject();
  delete safeUser.password;

  res.json({ token, user: safeUser });
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role = "jobseeker", adminSecret } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (role === "admin" && adminSecret !== process.env.ADMIN_REGISTER_SECRET) {
      return res.status(403).json({ message: "Invalid admin secret" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email, password, role });
    sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked" });
    }

    sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const { credential, role = "jobseeker" } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google login is not configured on the server" });
    }

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const allowedRoles = ["jobseeker", "employer"];
    const selectedRole = allowedRoles.includes(role) ? role : "jobseeker";

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ message: "Google email is not verified" });
    }

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email }]
    });

    if (user?.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked" });
    }

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub,
        authProvider: "google",
        role: selectedRole,
        profileImage: payload.picture ? { url: payload.picture } : undefined
      });
    } else {
      user.googleId = user.googleId || payload.sub;
      user.authProvider = user.authProvider || "google";
      if (!user.profileImage?.url && payload.picture) {
        user.profileImage = { url: payload.picture };
      }
      await user.save();
    }

    sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  res.json({ user: req.user });
}
