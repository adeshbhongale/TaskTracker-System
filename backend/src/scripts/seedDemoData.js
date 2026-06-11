const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Project = require('../models/Project');
const Phase = require('../models/Phase');
const Task = require('../models/Task');
const TaskAssignment = require('../models/TaskAssignment');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const getRelativeDate = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(10, 0, 0, 0);
  return date;
};

const parseRelativeDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string' && dateStr.toUpperCase() === 'TODAY') return new Date();

  const match = String(dateStr).match(/TODAY\s*([+-])\s*(\d+)\s*Days?/i);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    const days = parseInt(match[2], 10);
    return getRelativeDate(sign * days);
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
};

// ─── Main Seeder ──────────────────────────────────────────────────────────────
const seedDemoData = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/trucode';
  console.log('\n========================================');
  console.log('  Trucode TOPD - Demo Data Seeder');
  console.log('========================================\n');
  console.log('Connecting to:', mongoUri.replace(/:([^:@]+)@/, ':****@'));

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.\n');

    // Load mock data JSON
    const dataPath = path.join(__dirname, '../../data.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`data.json not found at ${dataPath}`);
    }
    const mockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // ── Step 1: Ensure Super Admin Exists ──────────────────────────────────
    console.log('[1/8] Checking Super Admin...');
    let superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });

    if (!superAdmin) {
      console.log('     No Super Admin found. Creating from .env config...');
      const adminEmail = (process.env.SUPERADMIN_EMAIL || 'superadmin@trucode.com').toLowerCase();
      const adminPassword = process.env.SUPERADMIN_PASSWORD || 'Admin@123';

      // Check if email is in use
      const emailInUse = await User.findOne({ email: adminEmail });
      if (emailInUse) {
        await User.deleteOne({ email: adminEmail });
        console.log(`     Removed conflicting user with email: ${adminEmail}`);
      }

      superAdmin = new User({
        name: 'Super Admin',
        email: adminEmail,
        phone: '9999999999',
        designation: 'System Administrator',
        employeeId: 'EMP-0001',
        password: adminPassword,
        role: 'SUPER_ADMIN',
        approvalStatus: 'APPROVED',
        department: null
      });
      await superAdmin.save();
      console.log(`     ✅ Super Admin created: ${superAdmin.email}`);
    } else {
      console.log(`     ✅ Super Admin already exists: ${superAdmin.email}`);
    }

    // ── Step 2: Clean existing demo data (preserve Super Admin) ────────────
    console.log('[2/8] Clearing previous demo data (preserving Super Admin)...');
    await Promise.all([
      User.deleteMany({ role: { $ne: 'SUPER_ADMIN' } }),
      Department.deleteMany({}),
      Project.deleteMany({}),
      Phase.deleteMany({}),
      Task.deleteMany({}),
      TaskAssignment.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
    console.log('     ✅ Demo collections cleared.\n');

    // Build user map (email → ObjectId)
    const userMap = {};
    userMap[superAdmin.email] = superAdmin._id;
    // Also map generic fallback in case data.json uses it
    userMap['superadmin@trucode.com'] = superAdmin._id;

    // ── Step 3: Seed Departments ────────────────────────────────────────────
    console.log('[3/8] Seeding Departments...');
    const deptMap = {};
    for (const deptItem of (mockData.departments || [])) {
      const dept = new Department({
        name: deptItem.name,
        status: deptItem.status || 'ACTIVE',
        createdBy: superAdmin._id
      });
      await dept.save();
      deptMap[dept.name] = dept._id;
    }
    console.log(`     ✅ Seeded ${Object.keys(deptMap).length} departments.`);

    // ── Step 4: Seed Users ──────────────────────────────────────────────────
    console.log('[4/8] Seeding Users (password: Password123)...');
    let userCount = 0;
    for (const userItem of (mockData.users || [])) {
      if (userItem.role === 'SUPER_ADMIN') continue; // skip, already handled

      const user = new User({
        name: userItem.name,
        email: userItem.email,
        phone: userItem.phone,
        designation: userItem.designation,
        employeeId: userItem.employeeId,
        password: 'Password123',
        role: userItem.role || 'NORMAL_USER',
        approvalStatus: userItem.approvalStatus || 'PENDING',
        department: userItem.departmentName ? deptMap[userItem.departmentName] : null
      });
      await user.save();
      userMap[user.email] = user._id;
      userCount++;
    }
    console.log(`     ✅ Seeded ${userCount} users. Total in map: ${Object.keys(userMap).length}.`);

    // ── Step 5: Seed Projects ───────────────────────────────────────────────
    console.log('[5/8] Seeding Projects...');
    const projectMap = {};
    for (const projItem of (mockData.projects || [])) {
      const creatorId = userMap[projItem.createdByEmail] || superAdmin._id;
      const project = new Project({
        projectCode: projItem.projectCode,
        name: projItem.name,
        description: projItem.description,
        priority: projItem.priority || 'MEDIUM',
        department: deptMap[projItem.departmentName] || null,
        startDate: parseRelativeDate(projItem.startDate),
        targetEndDate: parseRelativeDate(projItem.targetEndDate),
        documentationUrl: projItem.documentationUrl || '',
        createdBy: creatorId,
        status: projItem.status || 'NOT_STARTED'
      });
      await project.save();
      projectMap[project.name] = project._id;
    }
    console.log(`     ✅ Seeded ${Object.keys(projectMap).length} projects.`);

    // ── Step 6: Seed Phases ─────────────────────────────────────────────────
    console.log('[6/8] Seeding Phases...');
    const phaseMap = {};
    for (const phaseItem of (mockData.phases || [])) {
      const projId = projectMap[phaseItem.projectName];
      if (!projId) {
        console.warn(`     ⚠️  Project "${phaseItem.projectName}" not found for phase "${phaseItem.name}" - skipping.`);
        continue;
      }
      const phase = new Phase({
        project: projId,
        name: phaseItem.name,
        description: phaseItem.description,
        weightage: 0,
        targetEndDate: parseRelativeDate(phaseItem.targetEndDate),
        status: 'NOT_STARTED'
      });
      await phase.save();
      phaseMap[`${phaseItem.projectName}::${phaseItem.name}`] = phase._id;
    }
    console.log(`     ✅ Seeded ${Object.keys(phaseMap).length} phases.`);

    // ── Step 7: Seed Tasks & TaskAssignments ───────────────────────────────
    console.log('[7/8] Seeding Tasks & Assignments...');
    const taskMap = {};
    let taskCount = 0;
    let assignCount = 0;

    for (const taskItem of (mockData.tasks || [])) {
      const projId = projectMap[taskItem.projectName];
      const phaseId = phaseMap[`${taskItem.projectName}::${taskItem.phaseName}`];

      if (!projId || !phaseId) {
        console.warn(`     ⚠️  Missing project/phase for task "${taskItem.title}" - skipping.`);
        continue;
      }

      const assignees = (taskItem.assigneeEmails || [])
        .map(email => userMap[email])
        .filter(Boolean);
      const creatorId = userMap[taskItem.createdByEmail] || superAdmin._id;

      // Convert status to use our new enum
      let status = taskItem.status || 'PENDING';
      if (status === 'COMPLETED' || status === 'CLOSED') {
        status = 'COMPLETE';
      } else if (status === 'NOT_STARTED') {
        status = 'PENDING';
      }

      const taskData = {
        title: taskItem.title,
        description: taskItem.description,
        priority: taskItem.priority || 'MEDIUM',
        targetStartDate: parseRelativeDate(taskItem.targetStartDate),
        targetEndDate: parseRelativeDate(taskItem.targetEndDate),
        estimatedHours: taskItem.estimatedHours || 0,
        loggedHours: taskItem.loggedHours || 0,
        phase: phaseId,
        project: projId,
        assignedContributors: assignees,
        createdBy: creatorId,
        status: status,
        completionPercentage: status === 'COMPLETE' ? 100 : 0,
        acceptanceCriteria: taskItem.acceptanceCriteria || ""
      };

      // Set actualCompletionDate for completed tasks
      if (status === 'COMPLETE') {
        taskData.actualCompletionDate = parseRelativeDate(taskItem.targetEndDate);
      }

      if (taskItem.blockerDetails || status === 'BLOCKED') {
        const reason = taskItem.blockerDetails?.reason || 'Critical blocker seeded during load';
        taskData.blockerDetails = {
          reason,
          dependencyType: taskItem.blockerDetails?.dependencyType || 'Technical',
          expectedResolutionDate: parseRelativeDate(taskItem.blockerDetails?.expectedResolutionDate || 'TODAY + 5 Days'),
          markedAt: parseRelativeDate(taskItem.blockerDetails?.markedAt || 'TODAY')
        };
        taskData.blockers = [{
          reason,
          addedBy: assignees[0] || creatorId,
          createdAt: parseRelativeDate(taskItem.blockerDetails?.markedAt || 'TODAY')
        }];
      }

      const task = new Task(taskData);
      await task.save();
      taskMap[`${taskItem.projectName}::${taskItem.title}`] = task._id;
      taskCount++;

      if (assignees.length > 0) {
        const assignments = assignees.map(userId => ({
          task: task._id,
          user: userId,
          assignedBy: creatorId
        }));
        await TaskAssignment.insertMany(assignments);
        assignCount += assignments.length;
      }
    }
    console.log(`     ✅ Seeded ${taskCount} tasks, ${assignCount} assignments.`);

    // ── Step 8: Seed Notifications & Audits ────────────────────────────────
    console.log('[8/8] Seeding Notifications & Audit Logs...');
    let notifCount = 0;
    for (const notifItem of (mockData.notifications || [])) {
      const receiverId = userMap[notifItem.receiverEmail];
      if (!receiverId) continue;

      const senderId = userMap[notifItem.senderEmail] || null;
      const taskRef = (notifItem.taskTitle && notifItem.projectName)
        ? (taskMap[`${notifItem.projectName}::${notifItem.taskTitle}`] || null)
        : null;

      const notification = new Notification({
        receiver: receiverId,
        sender: senderId,
        task: taskRef,
        message: notifItem.message,
        type: notifItem.type || 'TASK_ASSIGNED',
        link: notifItem.link || '',
        isRead: notifItem.isRead || false,
        createdAt: parseRelativeDate(notifItem.createdAt)
      });
      await notification.save();
      notifCount++;
    }
    console.log(`     Notifications: ${notifCount} seeded.`);

    let auditCount = 0;
    for (const auditItem of (mockData.audits || [])) {
      const actorId = userMap[auditItem.actorEmail] || null;
      const actorUser = mockData.users
        ? mockData.users.find(u => u.email === auditItem.actorEmail)
        : null;

      const audit = new AuditLog({
        performedBy: actorId,
        performedByName: actorUser ? actorUser.name : 'System',
        actionType: auditItem.action,
        newValue: auditItem.details || {},
        ipAddress: '127.0.0.1',
        timestamp: parseRelativeDate(auditItem.createdAt)
      });
      await audit.save();
      auditCount++;
    }
    console.log(`     Audit logs: ${auditCount} seeded.\n`);

    // Enforce: completed tasks count != total allocated tasks count for each employee to check efficiencies
    console.log('[Post-processing] Adjusting task status counts to ensure completed and allocated counts are different...');
    const allEmployees = await User.find({ role: { $in: ['CONTRIBUTOR', 'TEAM_LEAD'] } });
    let empIndex = 0;
    for (const employee of allEmployees) {
      const employeeTasks = await Task.find({ assignedContributors: employee._id });
      if (employeeTasks.length > 0) {
        // Enforce completed task count will be 2, 3, or 4 different from each other
        const targetCompleted = Math.min(employeeTasks.length - 1, Math.max(1, 2 + (empIndex % 3)));
        
        for (let i = 0; i < employeeTasks.length; i++) {
          const t = employeeTasks[i];
          if (i < targetCompleted) {
            t.status = 'COMPLETE';
            t.completionPercentage = 100;
            t.actualCompletionDate = new Date();
            t.blockerDetails = null;
          } else {
            if (i === targetCompleted) {
              t.status = 'IN_PROGRESS';
              t.completionPercentage = 0;
              t.actualCompletionDate = null;
              t.blockerDetails = null;
            } else if (i === targetCompleted + 1) {
              t.status = 'BLOCKED';
              t.completionPercentage = 0;
              t.actualCompletionDate = null;
              t.blockers = [{
                reason: 'Critical dependency unresolved during seed generation',
                addedBy: employee._id,
                createdAt: new Date()
              }];
              t.blockerDetails = {
                reason: 'Critical dependency unresolved during seed generation',
                dependencyType: 'Technical',
                expectedResolutionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                markedAt: new Date()
              };
            } else {
              t.status = 'PENDING';
              t.completionPercentage = 0;
              t.actualCompletionDate = null;
              t.blockerDetails = null;
            }
          }
          await t.save();
        }
        console.log(`     Adjusted tasks for ${employee.name}: targetCompleted=${targetCompleted}, totalTasks=${employeeTasks.length}`);
        empIndex++;
      }
    }
    console.log('     ✅ Task completion counts adjusted.\n');

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log('========================================');
    console.log('  ✅  ALL DEMO DATA SEEDED SUCCESSFULLY');
    console.log('========================================');
    console.log('\n📋 Seeded Accounts (all passwords: Password123):\n');
    console.log('  Role          | Email');
    console.log('  --------------|------------------------------');
    console.log(`  SUPER ADMIN   | ${superAdmin.email}  (password: Admin@123)`);

    const seededUsers = mockData.users || [];
    seededUsers
      .filter(u => u.role !== 'SUPER_ADMIN')
      .forEach(u => {
        const roleLabel = (u.role || 'NORMAL_USER').padEnd(14);
        console.log(`  ${roleLabel}| ${u.email}`);
      });
    console.log('\n');

    await mongoose.disconnect();
    console.log('Database connection closed.');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      console.error(`   Duplicate key error on field: "${field}". Try running "npm run reset" first, then seed again.`);
    }
    try { await mongoose.disconnect(); } catch (e) { }
    process.exit(1);
  }
};

seedDemoData();
