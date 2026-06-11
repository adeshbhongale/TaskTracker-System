const Task = require('../models/Task');
const Phase = require('../models/Phase');
const Project = require('../models/Project');

// 1. Contributor Efficiency
// Calculated as percentage of completed tasks out of total assigned tasks
const calculateContributorEfficiency = async (userId) => {
  try {
    const tasks = await Task.find({ assignedContributors: userId });
    if (tasks.length === 0) return 0;

    const completedCount = tasks.filter(task => task.status === 'COMPLETE').length;
    return Math.round((completedCount / tasks.length) * 100);
  } catch (err) {
    console.error(`Error calculating contributor efficiency for user ${userId}:`, err);
    return 0;
  }
};

// 2. Phase Efficiency
// Calculated as percentage of completed tasks out of total tasks in the phase
const calculatePhaseEfficiency = async (phaseId) => {
  try {
    const tasks = await Task.find({ phase: phaseId });
    if (tasks.length === 0) return 0;

    const completedCount = tasks.filter(task => task.status === 'COMPLETE').length;
    return Math.round((completedCount / tasks.length) * 100);
  } catch (err) {
    console.error(`Error calculating phase efficiency for phase ${phaseId}:`, err);
    return 0;
  }
};

// 3. Project Efficiency
// Calculated as average of all its phases' efficiencies
const calculateProjectEfficiency = async (projectId) => {
  try {
    const phases = await Phase.find({ project: projectId });
    if (phases.length === 0) return 0;

    let totalPhaseEfficiency = 0;
    for (const phase of phases) {
      const phaseEff = await calculatePhaseEfficiency(phase._id);
      totalPhaseEfficiency += phaseEff;
    }

    return Math.round(totalPhaseEfficiency / phases.length);
  } catch (err) {
    console.error(`Error calculating project efficiency for project ${projectId}:`, err);
    return 0;
  }
};

// 4. Team Lead Efficiency
// Calculated as average of all projects created by that team lead
const calculateTeamLeadEfficiency = async (leadId) => {
  try {
    const projects = await Project.find({ createdBy: leadId });
    if (projects.length === 0) return 0;

    let totalProjectEfficiency = 0;
    for (const proj of projects) {
      const projEff = await calculateProjectEfficiency(proj._id);
      totalProjectEfficiency += projEff;
    }

    return Math.round(totalProjectEfficiency / projects.length);
  } catch (err) {
    console.error(`Error calculating team lead efficiency for ${leadId}:`, err);
    return 0;
  }
};

module.exports = {
  calculateContributorEfficiency,
  calculatePhaseEfficiency,
  calculateProjectEfficiency,
  calculateTeamLeadEfficiency
};
