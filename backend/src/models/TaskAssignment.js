const mongoose = require('mongoose');

const taskAssignmentSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to avoid duplicate assignments
taskAssignmentSchema.index({ task: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('TaskAssignment', taskAssignmentSchema);
