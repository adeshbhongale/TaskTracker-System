const AuditLog = require('../models/AuditLog');

const logAudit = async (req, actionType, previousValue = null, newValue = null) => {
  try {
    const performedBy = req && req.user ? req.user._id : null;
    const performedByName = req && req.user ? req.user.name : 'System/Visitor';
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';

    const auditEntry = new AuditLog({
      performedBy,
      performedByName,
      actionType,
      previousValue,
      newValue,
      ipAddress
    });

    await auditEntry.save();
  } catch (err) {
    console.error('Failed to log audit activity:', err);
  }
};

module.exports = {
  logAudit
};
