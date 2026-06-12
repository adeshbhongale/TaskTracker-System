const socketIo = require('socket.io');
const Notification = require('../models/Notification');

let io = null;
const userSockets = new Map(); // userId -> Set of socketIds

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*', // In production, restrict to your client domain
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    // Register user
    socket.on('register', (userId) => {
      if (userId) {
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        console.log(`Socket client registered`);
      }
    });

    // Unregister user on disconnect
    socket.on('disconnect', () => {
      for (const [userId, sockets] of userSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
          }
          console.log(`Socket client disconnected: User ID ${userId}, Socket ID ${socket.id}`);
          break;
        }
      }
    });
  });

  return io;
};

const triggerNotification = async ({ receiver, sender, task, message, type, link }) => {
  try {
    // Create & save notification in DB
    const notif = new Notification({
      receiver,
      sender,
      task,
      message,
      type,
      link
    });
    await notif.save();

    // Populate sender and task details if needed
    const populated = await Notification.findById(notif._id)
      .populate('sender', 'name email designation')
      .populate('task', 'taskId title');

    // Emit via Socket.io if receiver is online
    if (io && receiver) {
      const receiverStr = receiver.toString();
      const socketIds = userSockets.get(receiverStr);
      if (socketIds) {
        socketIds.forEach(socketId => {
          io.to(socketId).emit('notification', populated);
        });
      }
    }
    return populated;
  } catch (err) {
    console.error('Failed to create/trigger notification:', err);
  }
};

module.exports = {
  initSocket,
  triggerNotification
};
