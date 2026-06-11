const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  targetStartDate: {
    type: Date,
    required: true
  },
  targetEndDate: {
    type: Date,
    required: true
  },
  actualCompletionDate: {
    type: Date,
    default: null
  },
  phase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Phase',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignedContributors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  acceptanceCriteria: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED', 'DELAYED'],
    default: 'PENDING'
  },
  estimatedHours: {
    type: Number,
    default: 0
  },
  loggedHours: {
    type: Number,
    default: 0
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  blockerDetails: {
    reason: String,
    dependencyType: String,
    expectedResolutionDate: Date,
    markedAt: Date
  },
  blockers: [{
    reason: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  dayStatuses: [{
    date: { type: Date, required: true },
    status: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-increment taskId TS-101, TS-102...
taskSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const count = await mongoose.model('Task').countDocuments();
      this.taskId = `TS-${101 + count}`;
    } catch (err) {
      return next(err);
    }
  }

  // Rule: Status changes to COMPLETE -> Actual Completion Date = Current Date
  if (this.isModified('status')) {
    if (this.status === 'COMPLETE') {
      if (!this.actualCompletionDate) {
        this.actualCompletionDate = new Date();
      }
      this.completionPercentage = 100;
    } else {
      if (!this.isNew && !this.isModified('actualCompletionDate')) {
        this.actualCompletionDate = null;
      }
      this.completionPercentage = 0;
    }
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
