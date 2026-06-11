const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Project = require('../models/Project');
const Phase = require('../models/Phase');
const Task = require('../models/Task');
const TaskAssignment = require('../models/TaskAssignment');
const Notification = require('../models/Notification');

const resetDatabase = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/trucode';
  console.log('Connecting to database for reset:', mongoUri);

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    console.log('Resetting all collections...');

    const collectionsToClear = [
      { model: User, name: 'Users' },
      { model: Department, name: 'Departments' },
      { model: Project, name: 'Projects' },
      { model: Phase, name: 'Phases' },
      { model: Task, name: 'Tasks' },
      { model: TaskAssignment, name: 'Task Assignments' },
      { model: Notification, name: 'Notifications' }
    ];

    for (const col of collectionsToClear) {
      const result = await col.model.deleteMany({});
      console.log(`- Cleared ${col.name} (${result.deletedCount} items deleted)`);
    }

    console.log('\n--- DATABASE RESET COMPLETED SUCCESSFULLY ---');
    await mongoose.disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to reset database:', err);
    try {
      await mongoose.disconnect();
    } catch (e) { }
    process.exit(1);
  }
};

resetDatabase();
