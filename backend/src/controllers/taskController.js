const Task = require('../models/Task');
const TaskAssignment = require('../models/TaskAssignment');
const Project = require('../models/Project');
const Phase = require('../models/Phase');
const User = require('../models/User');
const { logAudit } = require('../services/audit');
const { triggerNotification } = require('../socket');

const createTask = async (req, res) => {
  const { title, description, priority, targetStartDate, targetEndDate, phase, project, dependencies, acceptanceCriteria } = req.body;

  if (!title || !targetStartDate || !targetEndDate || !phase || !project) {
    return res.status(400).json({ message: 'Title, Target Start Date, Target End Date, Phase, and Project are required' });
  }

  try {
    const proj = await Project.findById(project);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    const ph = await Phase.findById(phase);
    if (!ph) return res.status(404).json({ message: 'Phase not found' });

    const task = new Task({
      title,
      description,
      priority: priority || 'MEDIUM',
      targetStartDate,
      targetEndDate,
      phase,
      project,
      dependencies: dependencies || [],
      acceptanceCriteria,
      createdBy: req.user._id,
      status: 'PENDING'
    });

    await task.save();

    await logAudit(req, 'CREATE_TASK', null, task);

    return res.status(201).json({ message: 'Task created successfully', task });
  } catch (err) {
    return res.status(500).json({ message: 'Server error creating task', error: err.message });
  }
};

const assignContributors = async (req, res) => {
  const { taskId } = req.params;
  const { contributorIds } = req.body; // Array of User IDs

  if (!Array.isArray(contributorIds)) {
    return res.status(400).json({ message: 'Contributor IDs must be an array' });
  }

  try {
    const task = await Task.findById(taskId).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const previousValue = { assignedContributors: task.assignedContributors };

    // Validate contributors exist and are active contributors or team leads
    const users = await User.find({ _id: { $in: contributorIds }, approvalStatus: 'APPROVED' });
    if (users.length !== contributorIds.length) {
      return res.status(400).json({ message: 'One or more contributors do not exist or are not approved' });
    }

    // Update assignedContributors in Task model
    task.assignedContributors = contributorIds;
    await task.save();

    // Recreate TaskAssignment entries
    await TaskAssignment.deleteMany({ task: taskId });
    const assignments = contributorIds.map(userId => ({
      task: taskId,
      user: userId,
      assignedBy: req.user._id
    }));
    await TaskAssignment.insertMany(assignments);

    await logAudit(req, 'ASSIGN_CONTRIBUTORS', previousValue, { assignedContributors: contributorIds, taskId });

    // Send notifications to assigned contributors
    for (const user of users) {
      await triggerNotification({
        receiver: user._id,
        sender: req.user._id,
        task: task._id,
        message: `You have been assigned to Task: ${task.title} (ID: ${task.taskId}) under Project: ${task.project.name}`,
        type: 'TASK_ASSIGNED',
        link: `/tasks/${task._id}`
      });
    }

    const updatedTask = await Task.findById(taskId).populate('assignedContributors', 'name email designation department role');
    return res.json({ message: 'Contributors assigned successfully', task: updatedTask });
  } catch (err) {
    return res.status(500).json({ message: 'Server error assigning contributors', error: err.message });
  }
};

const updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status, blockerDetails } = req.body; // status: 'PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE', 'DELAYED'

  const validStatuses = ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE', 'DELAYED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status update value' });
  }

  if (status === 'BLOCKED' && req.user.role === 'CONTRIBUTOR') {
    return res.status(400).json({ message: 'Contributors are not allowed to block tasks' });
  }

  try {
    const task = await Task.findById(id).populate('project').populate('createdBy');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const previousValue = { status: task.status, blockerDetails: task.blockerDetails };

    task.status = status;

    if (status === 'BLOCKED') {
      if (!blockerDetails || !blockerDetails.reason || !blockerDetails.dependencyType || !blockerDetails.expectedResolutionDate) {
        return res.status(400).json({ message: 'Reason, dependency type, and expected resolution date are required to block a task' });
      }
      task.blockerDetails = {
        reason: blockerDetails.reason,
        dependencyType: blockerDetails.dependencyType,
        expectedResolutionDate: new Date(blockerDetails.expectedResolutionDate),
        markedAt: new Date()
      };
    } else {
      task.blockerDetails = null; // Clear if unblocked
    }

    await task.save();

    await logAudit(req, 'UPDATE_TASK_STATUS', previousValue, { status: task.status, blockerDetails: task.blockerDetails, taskId: id });

    // Notify project manager / creator
    let notificationMsg = `Task ${task.taskId} status updated to ${status} by ${req.user.name}.`;
    let notifType = 'TASK_STATUS_UPDATE';
    if (status === 'BLOCKED') {
      notificationMsg = `Task ${task.taskId} has been BLOCKED by ${req.user.name}. Reason: ${blockerDetails.reason}`;
      notifType = 'TASK_BLOCKED';
    } else if (status === 'COMPLETE') {
      notificationMsg = `Task ${task.taskId} was completed by ${req.user.name}.`;
      notifType = 'TASK_COMPLETED';
    }

    await triggerNotification({
      receiver: task.createdBy._id,
      sender: req.user._id,
      task: task._id,
      message: notificationMsg,
      type: notifType,
      link: `/tasks/${task._id}`
    });

    // Notify other assignees
    task.assignedContributors.forEach(async (cId) => {
      if (cId.toString() !== req.user._id.toString()) {
        await triggerNotification({
          receiver: cId,
          sender: req.user._id,
          task: task._id,
          message: `Task ${task.taskId} status updated to ${status} by teammate ${req.user.name}.`,
          type: 'TASK_STATUS_UPDATE',
          link: `/tasks/${task._id}`
        });
      }
    });

    return res.json({ message: 'Task status updated successfully', task });
  } catch (err) {
    return res.status(500).json({ message: 'Server error updating task status', error: err.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const { project, phase, contributor, status, priority, startDate, endDate } = req.query;
    const filter = {};

    if (phase) filter.phase = phase;

    // Enforce isolation:
    // - contributors can only see their own assigned tasks
    // - team leads can only see tasks under projects created by them
    if (req.user && req.user.role === 'CONTRIBUTOR') {
      filter.assignedContributors = req.user._id;
      if (project) filter.project = project;
    } else if (req.user && req.user.role === 'TEAM_LEAD') {
      const myProjects = await Project.find({ createdBy: req.user._id }).select('_id');
      const myProjectIds = myProjects.map(p => p._id);

      if (contributor && contributor === req.user._id.toString()) {
        filter.assignedContributors = req.user._id;
        if (project) filter.project = project;
      } else {
        if (project) {
          if (!myProjectIds.map(id => id.toString()).includes(project)) {
            filter.project = null; // Deny access to other lead's project
          } else {
            filter.project = project;
          }
        } else {
          filter.$or = [
            { project: { $in: myProjectIds } },
            { assignedContributors: req.user._id }
          ];
        }
        if (contributor) {
          filter.assignedContributors = contributor;
        }
      }
    } else {
      if (project) filter.project = project;
      if (contributor) filter.assignedContributors = contributor;
    }

    if (priority) filter.priority = priority;

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.targetEndDate = filter.targetEndDate || {};
      if (startDate) filter.targetEndDate.$gte = new Date(startDate);
      if (endDate) filter.targetEndDate.$lte = new Date(endDate);
    }

    const tasks = await Task.find(filter)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name email designation department role')
      .populate('createdBy', 'name email designation')
      .sort({ createdAt: -1 });

    // Mark as delayed dynamically if passed target date and update db
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const updatedTasks = [];

    for (let t of tasks) {
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
      updatedTasks.push(taskObj);
    }

    return res.json(updatedTasks);
  } catch (err) {
    return res.status(500).json({ message: 'Server error fetching tasks', error: err.message });
  }
};

const getTaskById = async (req, res) => {
  const { id } = req.params;
  try {
    const task = await Task.findById(id)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name email designation department')
      .populate('createdBy', 'name email designation')
      .populate('dependencies', 'taskId title')
      .populate('blockers.addedBy', 'name email designation')
      .populate('dayStatuses.addedBy', 'name email designation');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    let taskObj = task.toObject();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (taskObj.status !== 'COMPLETE' && taskObj.targetEndDate < todayStart) {
      taskObj.status = 'DELAYED';
    }
    // Ensure completionPercentage is correct
    if (taskObj.status === 'COMPLETE') {
      taskObj.completionPercentage = 100;
    } else {
      taskObj.completionPercentage = 0;
    }

    return res.json(taskObj);
  } catch (err) {
    return res.status(500).json({ message: 'Server error fetching task details', error: err.message });
  }
};

const addDayStatus = async (req, res) => {
  const { id } = req.params;
  const { date, status } = req.body;

  if (!date || !status) {
    return res.status(400).json({ message: 'Date and status are required' });
  }

  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Only allow leads and contributors to add day statuses
    if (req.user.role !== 'TEAM_LEAD' && req.user.role !== 'CONTRIBUTOR') {
      return res.status(403).json({ message: 'Only team leads and contributors can add day statuses' });
    }

    // Check if user is assigned to the task or is the creator
    const isAssigned = task.assignedContributors.some(c => c.toString() === req.user._id.toString());
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    if (!isAssigned && !isCreator) {
      return res.status(403).json({ message: 'You are not assigned to this task' });
    }

    task.dayStatuses.push({
      date: new Date(date),
      status,
      addedBy: req.user._id,
      createdAt: new Date()
    });

    await task.save();
    await logAudit(req, 'ADD_DAY_STATUS', null, { taskId: id, date, status });

    const updatedTask = await Task.findById(id)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name email designation department')
      .populate('createdBy', 'name email designation')
      .populate('dependencies', 'taskId title')
      .populate('blockers.addedBy', 'name email designation')
      .populate('dayStatuses.addedBy', 'name email designation');

    return res.json({ message: 'Day status added successfully', task: updatedTask });
  } catch (err) {
    return res.status(500).json({ message: 'Server error adding day status', error: err.message });
  }
};

const deleteDayStatus = async (req, res) => {
  const { id, statusId } = req.params;

  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Only allow admin or the creator to delete
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'MANAGEMENT') {
      const statusEntry = task.dayStatuses.id(statusId);
      if (!statusEntry) return res.status(404).json({ message: 'Day status not found' });
      if (statusEntry.addedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only delete your own day statuses' });
      }
    }

    task.dayStatuses.pull(statusId);
    await task.save();
    await logAudit(req, 'DELETE_DAY_STATUS', null, { taskId: id, statusId });

    const updatedTask = await Task.findById(id)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name email designation department')
      .populate('createdBy', 'name email designation')
      .populate('dependencies', 'taskId title')
      .populate('blockers.addedBy', 'name email designation')
      .populate('dayStatuses.addedBy', 'name email designation');

    return res.json({ message: 'Day status deleted successfully', task: updatedTask });
  } catch (err) {
    return res.status(500).json({ message: 'Server error deleting day status', error: err.message });
  }
};

const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, targetStartDate, targetEndDate, phase, acceptanceCriteria, status, actualCompletionDate } = req.body;
  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const previousValue = task.toObject();

    if (req.user.role === 'CONTRIBUTOR') {
      if (status !== undefined) {
        if (status === 'BLOCKED') {
          return res.status(400).json({ message: 'Contributors are not allowed to block tasks' });
        }
        task.status = status;
      }
      if (actualCompletionDate !== undefined) {
        task.actualCompletionDate = actualCompletionDate ? new Date(actualCompletionDate) : null;
      }
    } else {
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (priority) task.priority = priority;
      if (targetStartDate) task.targetStartDate = targetStartDate;
      if (targetEndDate) task.targetEndDate = targetEndDate;
      if (phase) task.phase = phase;
      if (acceptanceCriteria !== undefined) task.acceptanceCriteria = acceptanceCriteria;
      if (status) task.status = status;
      if (actualCompletionDate !== undefined) {
        task.actualCompletionDate = actualCompletionDate ? new Date(actualCompletionDate) : null;
      }
    }

    await task.save();
    await logAudit(req, 'UPDATE_TASK', previousValue, task);

    const updatedTask = await Task.findById(id)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name email designation department')
      .populate('createdBy', 'name email designation')
      .populate('dependencies', 'taskId title')
      .populate('blockers.addedBy', 'name email designation');

    return res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (err) {
    return res.status(500).json({ message: 'Server error updating task', error: err.message });
  }
};

const addBlocker = async (req, res) => {
  const { id } = req.params;
  const { reason, mentionedUsers } = req.body;
  if (!reason) {
    return res.status(400).json({ message: 'Blocker reason is required' });
  }
  try {
    const task = await Task.findById(id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.blockers.push({
      reason,
      addedBy: req.user._id,
      createdAt: new Date()
    });

    await task.save();

    await logAudit(req, 'ADD_TASK_BLOCKER', null, { taskId: id, reason });

    // Send notifications to mentioned users
    if (Array.isArray(mentionedUsers) && mentionedUsers.length > 0) {
      for (const mentionedUserId of mentionedUsers) {
        await triggerNotification({
          receiver: mentionedUserId,
          sender: req.user._id,
          task: task._id,
          message: `${req.user.name} mentioned you in a blocker on task ${task.taskId}: "${reason}"`,
          type: 'MENTION_RECEIVED',
          link: `/tasks/${task._id}`
        });
      }
    }

    const updatedTask = await Task.findById(id)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name email designation department')
      .populate('createdBy', 'name email designation')
      .populate('dependencies', 'taskId title')
      .populate('blockers.addedBy', 'name email designation');

    return res.json({ message: 'Blocker added successfully', task: updatedTask });
  } catch (err) {
    return res.status(500).json({ message: 'Server error adding blocker', error: err.message });
  }
};

const deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await Task.deleteOne({ _id: id });
    await TaskAssignment.deleteMany({ task: id });

    await logAudit(req, 'DELETE_TASK', task, null);

    return res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error deleting task', error: err.message });
  }
};

module.exports = {
  createTask,
  assignContributors,
  updateTaskStatus,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addBlocker,
  addDayStatus,
  deleteDayStatus
};
