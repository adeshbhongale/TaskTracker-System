const Project = require('../models/Project');
const Department = require('../models/Department');
const Phase = require('../models/Phase');
const Task = require('../models/Task');
const { logAudit } = require('../services/audit');
const { calculateProjectEfficiency } = require('../services/efficiency');

const createProject = async (req, res) => {
  const { name, description, priority, department, startDate, targetEndDate, documentationUrls } = req.body;

  if (!name || !department || !startDate || !targetEndDate) {
    return res.status(400).json({ message: 'Name, Department, Start Date, and Target End Date are required' });
  }

  try {
    // Verify department
    const dept = await Department.findById(department);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Auto-generate project code (PRJ-XXXXXX)
    let projectCode = '';
    let codeExists = true;
    while (codeExists) {
      const rand = Math.floor(100000 + Math.random() * 900000);
      projectCode = `PRJ-${rand}`;
      const existing = await Project.findOne({ projectCode });
      if (!existing) codeExists = false;
    }

    const project = new Project({
      projectCode,
      name,
      description,
      priority: priority || 'MEDIUM',
      department,
      startDate,
      targetEndDate,
      documentationUrls: documentationUrls || [],
      createdBy: req.user._id,
      status: 'NOT_STARTED'
    });

    await project.save();

    await logAudit(req, 'CREATE_PROJECT', null, project);

    return res.status(201).json({ message: 'Project created successfully', project });
  } catch (err) {
    return res.status(500).json({ message: 'Server error creating project', error: err.message });
  }
};

const getProjects = async (req, res) => {
  try {
    const { status, priority, department, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { projectCode: { $regex: search, $options: 'i' } }
      ];
    }

    // Team Lead can only see their own created projects
    if (req.user && req.user.role === 'TEAM_LEAD') {
      filter.createdBy = req.user._id;
    }

    // For contributors: only show projects where they have assigned tasks
    if (req.user && req.user.role === 'CONTRIBUTOR') {
      const assignedTasks = await Task.find({ assignedContributors: req.user._id }).select('project');
      const projectIds = [...new Set(assignedTasks.map(t => t.project.toString()))];
      filter._id = { $in: projectIds };
    }

    // Team Leads can view all, but if they want to filter, they can. Contributor can see their project tasks
    const projects = await Project.find(filter)
      .populate('department')
      .populate('createdBy', 'name email designation')
      .sort({ createdAt: -1 });

    // Attach current calculated project efficiency on the fly
    const projectsWithEfficiency = [];
    for (const proj of projects) {
      const efficiency = await calculateProjectEfficiency(proj._id);
      projectsWithEfficiency.push({
        ...proj.toObject(),
        efficiency
      });
    }

    return res.json(projectsWithEfficiency);
  } catch (err) {
    return res.status(500).json({ message: 'Server error fetching projects', error: err.message });
  }
};

const getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const project = await Project.findById(id)
      .populate('department')
      .populate('createdBy', 'name email designation');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const efficiency = await calculateProjectEfficiency(project._id);

    return res.json({
      ...project.toObject(),
      efficiency
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error fetching project details', error: err.message });
  }
};

const updateProject = async (req, res) => {
  const { id } = req.params;
  const { name, description, priority, status, startDate, targetEndDate, documentationUrls, actualCompletionDate } = req.body;

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const previousValue = project.toObject();

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (priority) project.priority = priority;
    if (status) project.status = status;
    if (startDate) project.startDate = startDate;
    if (targetEndDate) project.targetEndDate = targetEndDate;
    if (documentationUrls !== undefined) project.documentationUrls = documentationUrls;
    if (actualCompletionDate !== undefined) {
      project.actualCompletionDate = actualCompletionDate ? new Date(actualCompletionDate) : null;
    }

    await project.save();

    await logAudit(req, 'UPDATE_PROJECT', previousValue, project);

    return res.json({ message: 'Project updated successfully', project });
  } catch (err) {
    return res.status(500).json({ message: 'Server error updating project', error: err.message });
  }
};

const deleteProject = async (req, res) => {
  const { id } = req.params;
  try {
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Delete project, its phases, and tasks
    await Project.deleteOne({ _id: id });
    await Phase.deleteMany({ project: id });
    await Task.deleteMany({ project: id });

    await logAudit(req, 'DELETE_PROJECT', project, null);

    return res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error deleting project', error: err.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};

