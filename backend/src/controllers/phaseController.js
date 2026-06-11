const Phase = require('../models/Phase');
const Project = require('../models/Project');
const { logAudit } = require('../services/audit');
const { calculatePhaseEfficiency } = require('../services/efficiency');

const createPhase = async (req, res) => {
  const { project, name, description, targetEndDate } = req.body;

  if (!project || !name || !targetEndDate) {
    return res.status(400).json({ message: 'Project, Name, and Target End Date are required' });
  }

  try {
    const proj = await Project.findById(project);
    if (!proj) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const phase = new Phase({
      project,
      name,
      description,
      targetEndDate,
      weightage: 0,
      status: 'NOT_STARTED'
    });

    await phase.save();

    await logAudit(req, 'CREATE_PHASE', null, phase);

    return res.status(201).json({ message: 'Phase created successfully', phase });
  } catch (err) {
    return res.status(500).json({ message: 'Server error creating phase', error: err.message });
  }
};

const getPhasesByProject = async (req, res) => {
  const { projectId } = req.params;
  try {
    const phases = await Phase.find({ project: projectId }).sort({ createdAt: 1 });

    // Attach phase efficiency on the fly
    const phasesWithEfficiency = [];
    for (const ph of phases) {
      const efficiency = await calculatePhaseEfficiency(ph._id);
      phasesWithEfficiency.push({
        ...ph.toObject(),
        efficiency
      });
    }

    return res.json(phasesWithEfficiency);
  } catch (err) {
    return res.status(500).json({ message: 'Server error fetching phases', error: err.message });
  }
};

const updatePhase = async (req, res) => {
  const { id } = req.params;
  const { name, description, targetEndDate, actualEndDate } = req.body;

  try {
    const phase = await Phase.findById(id);
    if (!phase) {
      return res.status(404).json({ message: 'Phase not found' });
    }

    const previousValue = phase.toObject();

    if (name) phase.name = name;
    if (description !== undefined) phase.description = description;
    if (targetEndDate) phase.targetEndDate = targetEndDate;
    if (actualEndDate !== undefined) {
      phase.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;
    }

    await phase.save();

    await logAudit(req, 'UPDATE_PHASE', previousValue, phase);

    return res.json({ message: 'Phase updated successfully', phase });
  } catch (err) {
    return res.status(500).json({ message: 'Server error updating phase', error: err.message });
  }
};

const Task = require('../models/Task');

const deletePhase = async (req, res) => {
  const { id } = req.params;
  try {
    const phase = await Phase.findById(id);
    if (!phase) return res.status(404).json({ message: 'Phase not found' });

    await Phase.deleteOne({ _id: id });
    await Task.deleteMany({ phase: id });

    await logAudit(req, 'DELETE_PHASE', phase, null);

    return res.json({ message: 'Phase deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error deleting phase', error: err.message });
  }
};

module.exports = {
  createPhase,
  getPhasesByProject,
  updatePhase,
  deletePhase
};

