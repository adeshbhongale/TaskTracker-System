const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'REGISTRATION_APPROVAL',
      'TASK_ASSIGNED',
      'TASK_STATUS_UPDATE',
      'TASK_COMPLETED',
      'TASK_BLOCKED',
      'MENTION_RECEIVED',
      'DEPARTMENT_CHANGE',
      'ROLE_CHANGE',
      'INFO'
    ],
    default: 'INFO'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
