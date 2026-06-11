const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');

const seedSuperadmin = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/trucode';
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be defined in .env');
    process.exit(1);
  }

  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Check if Superadmin already exists
    const existingAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (existingAdmin) {
      console.log(`Super Admin already exists with email: ${existingAdmin.email}. Skipping seed.`);
      process.exit(0);
    }

    // Check if email is in use
    const emailInUse = await User.findOne({ email: email.toLowerCase() });
    if (emailInUse) {
      console.error(`Error: The email ${email} is already in use by a non-admin user.`);
      process.exit(1);
    }

    // Create Super Admin
    const superAdmin = new User({
      name: 'Super Admin',
      email: email.toLowerCase(),
      phone: '9999999999',
      designation: 'Super Admin',
      employeeId: 'EMP-0000',
      password: password, // Model's pre-save hook will hash this
      role: 'SUPER_ADMIN',
      approvalStatus: 'APPROVED',
      department: null
    });

    await superAdmin.save();
    console.log(`Successfully seeded Super Admin user:`);
    console.log(`- Email: ${email}`);
    console.log(`- Employee ID: EMP-0000`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed Super Admin:', err);
    process.exit(1);
  }
};

seedSuperadmin();
