const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/auth');
const { logAudit } = require('../services/audit');
const { triggerNotification } = require('../socket');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const register = async (req, res) => {
  const { name, email, phone, designation, employeeId, password, confirmPassword } = req.body;

  // Basic validation
  if (!name || !email || !phone || !designation || !employeeId || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  // Password complexity check
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    });
  }

  if (email.length >= 30) {
    return res.status(400).json({ message: 'Email must be less than 30 characters.' });
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
  }

  try {
    // Unique check
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({ message: 'Phone number is already in use' });
    }

    const empIdExists = await User.findOne({ employeeId });
    if (empIdExists) {
      return res.status(400).json({ message: 'Employee ID is already in use' });
    }

    // Create user as NORMAL_USER, PENDING
    const newUser = new User({
      name,
      email,
      phone,
      designation,
      employeeId,
      password, // pre-save hook will hash
      role: 'NORMAL_USER',
      approvalStatus: 'PENDING',
      department: null
    });

    await newUser.save();

    // Log Activity
    await logAudit(req, 'USER_REGISTER', null, {
      userId: newUser._id,
      email: newUser.email,
      role: newUser.role
    });

    // Notify Super Admins
    const superadmins = await User.find({ role: 'SUPER_ADMIN' });
    for (const admin of superadmins) {
      await triggerNotification({
        receiver: admin._id,
        sender: newUser._id,
        message: `New Employee Registered - Name: ${newUser.name}, Employee ID: ${newUser.employeeId}. Please assign role.`,
        type: 'REGISTRATION_APPROVAL',
        link: '/admin/users'
      });
    }

    return res.status(201).json({
      message: 'Registration successful. Account is pending administrator approval.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        approvalStatus: newUser.approvalStatus
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).populate('department');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Handle Deactivated Status
    if (user.approvalStatus === 'DEACTIVATED') {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    // Generate tokens (even if pending, to allow viewing the Pending screen safely)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    await logAudit({ user, socket: req.socket, headers: req.headers }, 'LOGIN', null, { userId: user._id, email: user.email });

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        designation: user.designation,
        employeeId: user.employeeId,
        role: user.role,
        approvalStatus: user.approvalStatus,
        department: user.department
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error during login', error: err.message });
  }
};

const refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).populate('department');
    
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    if (user.approvalStatus === 'DEACTIVATED') {
      return res.status(403).json({ message: 'Your account has been deactivated.' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token', error: err.message });
  }
};

const logout = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Refresh token is required for logout' });
  }

  try {
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = null;
      await user.save();
      await logAudit({ user, socket: req.socket, headers: req.headers }, 'LOGOUT', null, { userId: user._id });
    }
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error during logout', error: err.message });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout
};
