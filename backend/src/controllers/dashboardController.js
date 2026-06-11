const User = require('../models/User');
const Department = require('../models/Department');
const Project = require('../models/Project');
const Phase = require('../models/Phase');
const Task = require('../models/Task');
const {
  calculateContributorEfficiency,
  calculateProjectEfficiency
} = require('../services/efficiency');

const getOverviewMetrics = async (req, res) => {
  try {
    // 1. Core counters
    const employeeCount = await User.countDocuments({ role: { $ne: 'SUPER_ADMIN' } });
    const pendingApprovalsCount = await User.countDocuments({ approvalStatus: 'PENDING' });
    const departmentCount = await Department.countDocuments();
    const projectsCount = await Project.countDocuments();
    const tasksCount = await Task.countDocuments();

    // 2. Task breakdown
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const blockedTasksCount = await Task.countDocuments({ status: 'BLOCKED' });
    const delayedTasksCount = await Task.countDocuments({
      status: { $ne: 'COMPLETE' },
      targetEndDate: { $lt: todayStart }
    });
    const completedTasksCount = await Task.countDocuments({ status: 'COMPLETE' });
    const inProgressTasksCount = await Task.countDocuments({ status: 'IN_PROGRESS' });
    const notStartedTasksCount = await Task.countDocuments({ status: 'PENDING' });

    // 3. Overall Org Efficiency (Average of all project efficiencies)
    const projects = await Project.find({});
    let totalProjectEff = 0;
    for (const proj of projects) {
      totalProjectEff += await calculateProjectEfficiency(proj._id);
    }
    const overallEfficiency = projects.length > 0 ? Math.round(totalProjectEff / projects.length) : 100;

    return res.json({
      employeeCount,
      pendingApprovalsCount,
      departmentCount,
      projectsCount,
      tasksCount,
      blockedTasksCount,
      delayedTasksCount,
      completedTasksCount,
      inProgressTasksCount,
      notStartedTasksCount,
      overallEfficiency
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error loading overview metrics', error: err.message });
  }
};

const getResourceEfficiencyTable = async (req, res) => {
  try {
    const contributors = await User.find({ role: 'CONTRIBUTOR', approvalStatus: 'APPROVED' }).populate('department');
    const records = [];

    for (const user of contributors) {
      const assignedCount = await Task.countDocuments({ assignedContributors: user._id });
      const completedCount = await Task.countDocuments({
        assignedContributors: user._id,
        status: 'COMPLETE'
      });
      const efficiency = await calculateContributorEfficiency(user._id);

      records.push({
        id: user._id,
        name: user.name,
        role: user.role,
        department: user.department ? user.department.name : 'N/A',
        assignedTasks: assignedCount,
        completedTasks: completedCount,
        efficiency
      });
    }

    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: 'Server error loading resource efficiency table', error: err.message });
  }
};

const getTeamLeadDashboard = async (req, res) => {
  const leadId = req.user._id;
  try {
    const projectDocs = await Project.find({ createdBy: leadId }).populate('department');

    const projectIds = projectDocs.map(p => p._id);

    // Build projects with efficiency and dates as plain objects
    const projects = [];
    for (const proj of projectDocs) {
      const efficiency = await calculateProjectEfficiency(proj._id);
      projects.push({
        ...proj.toObject(),
        efficiency
      });
    }

    const tasks = await Task.find({ project: { $in: projectIds } });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const blockedCount = tasks.filter(t => t.status === 'BLOCKED').length;
    const delayedCount = tasks.filter(t => t.status !== 'COMPLETE' && t.targetEndDate < todayStart).length;
    const completedCount = tasks.filter(t => t.status === 'COMPLETE').length;
    const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const notStartedCount = tasks.filter(t => t.status === 'PENDING').length;
    const totalTaskCount = tasks.length;

    // Contributor IDs under this lead's projects
    const contributorIds = new Set();
    tasks.forEach(t => t.assignedContributors.forEach(c => contributorIds.add(c.toString())));
    const teamCount = contributorIds.size;

    // Team efficiency (average of Lead's contributors)
    let totalContributorEfficiency = 0;
    const contributorEfficiencyTable = [];
    for (const cId of contributorIds) {
      const eff = await calculateContributorEfficiency(cId);
      totalContributorEfficiency += eff;
      const User = require('../models/User');
      const cUser = await User.findById(cId).populate('department').select('name designation department role');
      if (cUser) {
        const assignedCount = await Task.countDocuments({ assignedContributors: cId, project: { $in: projectIds } });
        const completedTaskCount = await Task.countDocuments({ assignedContributors: cId, project: { $in: projectIds }, status: 'COMPLETE' });
        contributorEfficiencyTable.push({
          id: cUser._id,
          name: cUser.name,
          designation: cUser.designation,
          department: cUser.department ? cUser.department.name : 'N/A',
          role: cUser.role,
          assignedTasks: assignedCount,
          completedTasks: completedTaskCount,
          efficiency: eff
        });
      }
    }
    const teamEfficiency = teamCount > 0 ? Math.round(totalContributorEfficiency / teamCount) : 0;

    // Upcoming deadlines: tasks due in next 7 days, not completed
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const upcomingTasks = await Task.find({
      project: { $in: projectIds },
      status: { $ne: 'COMPLETE' },
      targetEndDate: { $gte: todayStart, $lte: sevenDaysLater }
    }).populate('project').populate('assignedContributors', 'name');

    return res.json({
      projectCount: projects.length,
      teamCount,
      blockedCount,
      delayedCount,
      completedCount,
      inProgressCount,
      notStartedCount,
      totalTaskCount,
      teamEfficiency,
      upcomingTasks,
      projects,
      contributorEfficiencyTable
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error loading lead dashboard metrics', error: err.message });
  }
};

const getContributorDashboard = async (req, res) => {
  const contributorId = req.user._id;
  try {
    const tasks = await Task.find({ assignedContributors: contributorId }).populate('project').populate('phase');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfToday = todayStart;
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const myTasks = tasks.map(t => {
      let taskObj = t.toObject();
      if (taskObj.status !== 'COMPLETE' && taskObj.targetEndDate < todayStart) {
        taskObj.status = 'DELAYED';
      }
      // Ensure completionPercentage is correct
      if (taskObj.status === 'COMPLETE') {
        taskObj.completionPercentage = 100;
      } else {
        taskObj.completionPercentage = 0;
      }
      return taskObj;
    });

    const dueToday = myTasks.filter(t => t.status !== 'COMPLETE' && t.targetEndDate >= startOfToday && t.targetEndDate <= endOfToday);
    const completedCount = myTasks.filter(t => t.status === 'COMPLETE').length;
    const inProgressCount = myTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const notStartedCount = myTasks.filter(t => t.status === 'PENDING').length;
    const blockedCount = myTasks.filter(t => t.status === 'BLOCKED').length;
    const delayedCount = myTasks.filter(t => t.status === 'DELAYED').length;
    const totalCount = myTasks.length;
    const personalEfficiency = await calculateContributorEfficiency(contributorId);

    // Project-wise efficiency
    const projectMap = new Map();
    for (const task of myTasks) {
      const projectId = task.project?._id?.toString();
      if (projectId && !projectMap.has(projectId)) {
        projectMap.set(projectId, {
          id: projectId,
          name: task.project?.name || 'Unknown Project',
          totalTasks: 0,
          completedTasks: 0
        });
      }
      if (projectId) {
        const proj = projectMap.get(projectId);
        proj.totalTasks++;
        if (task.status === 'COMPLETE') {
          proj.completedTasks++;
        }
      }
    }

    const projectWiseEfficiency = Array.from(projectMap.values()).map(proj => ({
      ...proj,
      efficiency: proj.totalTasks > 0 ? Math.round((proj.completedTasks / proj.totalTasks) * 100) : 0
    }));

    // Recently updated tasks (last 5)
    const recentTasks = [...myTasks]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);

    return res.json({
      myTasks,
      dueToday,
      completedCount,
      inProgressCount,
      notStartedCount,
      blockedCount,
      delayedCount,
      totalCount,
      personalEfficiency,
      projectWiseEfficiency,
      recentTasks
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error loading contributor dashboard metrics', error: err.message });
  }
};

module.exports = {
  getOverviewMetrics,
  getResourceEfficiencyTable,
  getTeamLeadDashboard,
  getContributorDashboard
};
