const Department = require('../models/Department');
const { logAudit } = require('../services/audit');

const createDepartment = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Department name is required' });
  }

  try {
    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Department name already exists' });
    }

    const dept = new Department({
      name: name.trim(),
      createdBy: req.user._id
    });

    await dept.save();

    await logAudit(req, 'CREATE_DEPARTMENT', null, dept);

    return res.status(201).json({ message: 'Department created successfully', department: dept });
  } catch (err) {
    return res.status(500).json({ message: 'Server error creating department', error: err.message });
  }
};

const editDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  try {
    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const previousValue = { name: dept.name, status: dept.status };

    if (name) {
      const existing = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({ message: 'Department name already exists' });
      }
      dept.name = name.trim();
    }

    if (status) {
      dept.status = status;
    }

    await dept.save();

    await logAudit(req, 'EDIT_DEPARTMENT', previousValue, dept);

    return res.json({ message: 'Department updated successfully', department: dept });
  } catch (err) {
    return res.status(500).json({ message: 'Server error updating department', error: err.message });
  }
};

const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // We can soft delete/deactivate, or delete if no users are in it
    // Let's delete it directly, checking if users are currently in it
    const User = require('../models/User');
    const userCount = await User.countDocuments({ department: id });
    if (userCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete department: it has active employees. Deactivate it instead.'
      });
    }

    await Department.findByIdAndDelete(id);

    await logAudit(req, 'DELETE_DEPARTMENT', dept, null);

    return res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error deleting department', error: err.message });
  }
};

const listDepartments = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const departments = await Department.find(filter).sort({ name: 1 });
    return res.json(departments);
  } catch (err) {
    return res.status(500).json({ message: 'Server error listing departments', error: err.message });
  }
};

module.exports = {
  createDepartment,
  editDepartment,
  deleteDepartment,
  listDepartments
};
