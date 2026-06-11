const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  performedByName: {
    type: String,
    default: 'System'
  },
  actionType: {
    type: String,
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
