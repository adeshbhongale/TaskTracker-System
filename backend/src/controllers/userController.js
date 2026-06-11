const User = require('../models/User');
const Department = require('../models/Department');
const { logAudit } = require('../services/audit');
const { triggerNotification } = require('../socket');
const bcrypt = require('bcryptjs');
const { calculateContributorEfficiency, calculateTeamLeadEfficiency } = require('../services/efficiency');

const getUsers = async (req, res) => {
  try {
    const { status, role, department } = req.query;
    const filter = {};
    if (status) filter.approvalStatus = status;
    if (role) filter.role = role;
    if (department) filter.department = department;

    // Filter based on current user's role
    if (req.user.role === 'TEAM_LEAD') {
      // Team lead can only see TEAM_LEAD and CONTRIBUTOR
      filter.role = { $in: ['TEAM_LEAD', 'CONTRIBUTOR'] };
      filter.approvalStatus = 'APPROVED';
    } else if (req.user.role === 'MANAGEMENT') {
      // Management can see all except SUPER_ADMIN and PENDING
      filter.role = { $ne: 'SUPER_ADMIN' };
      filter.approvalStatus = 'APPROVED';
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('department')
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: 'Server error fetching users', error: err.message });
  }
};

const assignRole = async (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ message: 'User ID and Role are required' });
  }

  const validRoles = ['MANAGEMENT', 'TEAM_LEAD', 'CONTRIBUTOR', 'SUPER_ADMIN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role assignment' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousValue = { role: user.role, approvalStatus: user.approvalStatus };
    
    // Assign role
    user.role = role;
    
    // Automatically approve if role is assigned from normal user
    let approvalTriggered = false;
    if (user.approvalStatus === 'PENDING') {
      user.approvalStatus = 'APPROVED';
      approvalTriggered = true;
    }

    await user.save();
    const updatedUser = await User.findById(userId).populate('department');

    // Audit log
    await logAudit(req, 'ASSIGN_ROLE', previousValue, { role: user.role, approvalStatus: user.approvalStatus, userId });

    // Notify employee
    await triggerNotification({
      receiver: user._id,
      sender: req.user._id,
      message: approvalTriggered
        ? `Your account has been approved. Role: ${role}${user.department ? `, Department: ${updatedUser.department.name}` : ''}`
        : `Your system role has been updated to: ${role}`,
      type: approvalTriggered ? 'REGISTRATION_APPROVAL' : 'ROLE_CHANGE',
      link: '/'
    });

    return res.json({ message: 'Role assigned successfully', user: updatedUser });
  } catch (err) {
    return res.status(500).json({ message: 'Server error assigning role', error: err.message });
  }
};

const assignDepartment = async (req, res) => {
  const { userId, departmentId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validation: Management users have no department
    if (user.role === 'MANAGEMENT') {
      return res.status(400).json({ message: 'Management users cannot be assigned to departments' });
    }

    let dept = null;
    if (departmentId) {
      dept = await Department.findById(departmentId);
      if (!dept || dept.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Active department not found' });
      }
    }

    const previousValue = { department: user.department };
    user.department = departmentId || null;
    await user.save();

    const updatedUser = await User.findById(userId).populate('department');

    await logAudit(req, 'ASSIGN_DEPARTMENT', previousValue, { department: user.department, userId });

    // Notify employee
    await triggerNotification({
      receiver: user._id,
      sender: req.user._id,
      message: departmentId 
        ? `You have been assigned to Department: ${dept.name}`
        : `You have been removed from your department`,
      type: 'DEPARTMENT_CHANGE',
      link: '/'
    });

    return res.json({ message: 'Department assigned successfully', user: updatedUser });
  } catch (err) {
    return res.status(500).json({ message: 'Server error assigning department', error: err.message });
  }
};

const deactivateUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ message: 'Super Admin users cannot be deactivated' });
    }

    const previousValue = { approvalStatus: user.approvalStatus };
    user.approvalStatus = 'DEACTIVATED';
    user.refreshToken = null; // revoke login
    await user.save();

    await logAudit(req, 'DEACTIVATE_USER', previousValue, { approvalStatus: user.approvalStatus, userId });

    return res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error deactivating user', error: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Valid User ID and password (min 8 chars) are required' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.refreshToken = null; // Log user out
    await user.save();

    await logAudit(req, 'RESET_PASSWORD', null, { userId });

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error resetting password', error: err.message });
  }
};

const updateUserPersonalInfo = async (req, res) => {
  const { userId } = req.params;
  const { name, email, designation, phone } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const prev = { name: user.name, email: user.email, designation: user.designation, phone: user.phone };
    if (name) user.name = name;
    if (email) user.email = email;
    if (designation !== undefined) user.designation = designation;
    if (phone !== undefined) user.phone = phone;
    await user.save();
    await logAudit(req, 'UPDATE_USER_INFO', prev, { name: user.name, email: user.email });
    const updated = await User.findById(userId).select('-password').populate('department');
    return res.json({ message: 'User info updated successfully', user: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating user info', error: err.message });
  }
};

const getUserEfficiency = async (req, res) => {
  const { userId } = req.params;
  try {
    const userObj = await User.findById(userId);
    if (!userObj) return res.status(404).json({ message: 'User not found' });

    let efficiency = 0;
    if (userObj.role === 'TEAM_LEAD') {
      efficiency = await calculateTeamLeadEfficiency(userId);
    } else {
      efficiency = await calculateContributorEfficiency(userId);
    }
    return res.json({ efficiency });
  } catch (err) {
    return res.status(500).json({ message: 'Error calculating user efficiency', error: err.message });
  }
};

const Notification = require('../models/Notification');

const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ receiver: req.user._id })
      .populate('sender', 'name email designation')
      .populate('task', 'taskId title')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching notifications', error: err.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, receiver: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json(notification);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating notification', error: err.message });
  }
};

const getUserById = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).select('-password').populate('department');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching user details', error: err.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  assignRole,
  assignDepartment,
  deactivateUser,
  resetPassword,
  updateUserPersonalInfo,
  getUserEfficiency,
  getUserNotifications,
  markNotificationRead
};

