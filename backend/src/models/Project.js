const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectCode: {
    type: String,
    required: true,
    unique: true
  },
  name: {
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
    default: 'MEDIUM'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  targetEndDate: {
    type: Date,
    required: true
  },
  documentationUrls: [{
    type: String,
    trim: true
  }],
  actualCompletionDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CLOSED', 'DELAYED'],
    default: 'NOT_STARTED'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
