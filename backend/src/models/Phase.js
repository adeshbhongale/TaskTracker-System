const mongoose = require('mongoose');

const phaseSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
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
  targetEndDate: {
    type: Date,
    required: true
  },
  actualEndDate: {
    type: Date,
    default: null
  },
  weightage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'],
    default: 'NOT_STARTED'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Phase', phaseSchema);
