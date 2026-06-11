const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const Department = require('./src/models/Department');
const Project = require('./src/models/Project');
const Phase = require('./src/models/Phase');
const Task = require('./src/models/Task');
const TaskAssignment = require('./src/models/TaskAssignment');
const ProgressLog = require('./src/models/ProgressLog');
const Notification = require('./src/models/Notification');
const AuditLog = require('./src/models/AuditLog');
const {
  calculateContributorEfficiency,
  calculatePhaseEfficiency,
  calculateProjectEfficiency,
  calculateTeamLeadEfficiency
} = require('./src/services/efficiency');

const runE2ETest = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/trucode';
  console.log('--- STARTING E2E INTEGRATION TEST ---');
  console.log('Connecting to database:', mongoUri);

  try {
    await mongoose.connect(mongoUri);
    console.log('[PASS] Connected to MongoDB.');

    // Clean up test items
    console.log('Cleaning up previous test data...');
    await User.deleteMany({ email: { $in: ['test_admin@trucode.com', 'test_contributor@trucode.com', 'test_lead@trucode.com'] } });
    await Department.deleteMany({ name: 'MERN Test Department' });
    // Find previous test projects/tasks and delete
    const testDepts = await Department.find({ name: 'MERN Test Department' });
    const testDeptIds = testDepts.map(d => d._id);
    await Project.deleteMany({ name: 'Trucode Dashboard Test' });
    
    // 1. Create Department
    console.log('\nStep 1: Creating Department...');
    const mockAdmin = new User({
      name: 'Test Admin',
      email: 'test_admin@trucode.com',
      phone: '1234567890',
      designation: 'Administrator',
      employeeId: 'EMP-T100',
      password: 'Password@123',
      role: 'SUPER_ADMIN',
      approvalStatus: 'APPROVED'
    });
    await mockAdmin.save();

    const dept = new Department({
      name: 'MERN Test Department',
      createdBy: mockAdmin._id
    });
    await dept.save();
    console.log(`[PASS] Department created: "${dept.name}" (ID: ${dept._id})`);

    // 2. Register Contributor (starts PENDING, NORMAL_USER)
    console.log('\nStep 2: Registering Contributor...');
    const contributor = new User({
      name: 'Adesh Contributor',
      email: 'test_contributor@trucode.com',
      phone: '0987654321',
      designation: 'Developer',
      employeeId: 'EMP-0025',
      password: 'Contributor@123',
      role: 'NORMAL_USER',
      approvalStatus: 'PENDING'
    });
    await contributor.save();
    console.log(`[PASS] Contributor registered: Name="${contributor.name}" Role=${contributor.role} Status=${contributor.approvalStatus}`);

    // 3. Admin Approves and Assigns Role & Dept
    console.log('\nStep 3: Admin Approving & Assigning Role/Department...');
    contributor.role = 'CONTRIBUTOR';
    contributor.approvalStatus = 'APPROVED';
    contributor.department = dept._id;
    await contributor.save();
    console.log(`[PASS] Contributor approved: Role=${contributor.role} Dept=${contributor.department} Status=${contributor.approvalStatus}`);

    // Create a Team Lead
    const teamLead = new User({
      name: 'Team Lead Mrunal',
      email: 'test_lead@trucode.com',
      phone: '1122334455',
      designation: 'Tech Lead',
      employeeId: 'EMP-TL01',
      password: 'LeadPassword@123',
      role: 'TEAM_LEAD',
      approvalStatus: 'APPROVED',
      department: dept._id
    });
    await teamLead.save();

    // 4. Team Lead Creates Project
    console.log('\nStep 4: Team Lead Creating Project...');
    const project = new Project({
      projectCode: `PRJ-${Math.floor(100000 + Math.random() * 900000)}`,
      name: 'Trucode Dashboard Test',
      description: 'Enterprise Operational performance system',
      priority: 'HIGH',
      department: dept._id,
      startDate: new Date(),
      targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
      createdBy: teamLead._id,
      status: 'IN_PROGRESS'
    });
    await project.save();
    console.log(`[PASS] Project created: Code=${project.projectCode} Name="${project.name}"`);

    // 5. Team Lead Creates Phases
    console.log('\nStep 5: Creating Phases...');
    const phase1 = new Phase({
      project: project._id,
      name: 'Design Phase',
      weightage: 30,
      targetEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    });
    const phase2 = new Phase({
      project: project._id,
      name: 'Development Phase',
      weightage: 70,
      targetEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });
    await phase1.save();
    await phase2.save();
    console.log(`[PASS] Phases created. Design (30%), Development (70%)`);

    // 6. Team Lead Creates & Assigns Tasks
    console.log('\nStep 6: Creating Tasks & Assignments...');
    const task1 = new Task({
      title: 'Design HMI Layouts',
      description: 'Create premium CSS layouts',
      priority: 'HIGH',
      targetStartDate: new Date(),
      targetEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // due in 2 days
      phase: phase1._id,
      project: project._id,
      assignedContributors: [contributor._id],
      createdBy: teamLead._id,
      status: 'NOT_STARTED'
    });
    await task1.save();

    const task2 = new Task({
      title: 'Develop Auth Controller',
      description: 'JWT and refresh tokens logic',
      priority: 'CRITICAL',
      targetStartDate: new Date(),
      targetEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // due in 4 days
      phase: phase2._id,
      project: project._id,
      assignedContributors: [contributor._id],
      createdBy: teamLead._id,
      status: 'NOT_STARTED'
    });
    await task2.save();

    console.log(`[PASS] Tasks created: ${task1.taskId} (${task1.title}) and ${task2.taskId} (${task2.title})`);

    // Verify initial efficiencies
    let cEff = await calculateContributorEfficiency(contributor._id);
    let p1Eff = await calculatePhaseEfficiency(phase1._id);
    let projEff = await calculateProjectEfficiency(project._id);
    console.log(`Initial Efficiencies: Contributor=${cEff}%, Phase1=${p1Eff}%, Project=${projEff}%`);

    // 7. Contributor Logs Progress & Completes Task 1
    console.log('\nStep 7: Contributor Logging Progress & Completing Task 1...');
    const log1 = new ProgressLog({
      task: task1._id,
      contributor: contributor._id,
      todayWork: 'Completed the HMI CSS layouts and glassmorphism. @test_lead@trucode.com review layout files.',
      hoursWorked: 6,
      completionPercentage: 100,
      statusUpdatedTo: 'COMPLETED',
      mentions: [teamLead._id]
    });
    await log1.save();

    task1.status = 'COMPLETED';
    task1.loggedHours = 6;
    task1.completionPercentage = 100;
    await task1.save();
    console.log('[PASS] Progress log added and Task 1 status marked as COMPLETED.');

    // 8. Re-evaluate Efficiencies
    console.log('\nStep 8: Re-calculating Efficiencies...');
    cEff = await calculateContributorEfficiency(contributor._id);
    p1Eff = await calculatePhaseEfficiency(phase1._id);
    let p2Eff = await calculatePhaseEfficiency(phase2._id);
    projEff = await calculateProjectEfficiency(project._id);
    let tlEff = await calculateTeamLeadEfficiency(teamLead._id);

    console.log(`[RESULTS] Recalculated Efficiencies:`);
    console.log(`- Contributor Efficiency: ${cEff}% (Expected 50% since 1 of 2 tasks is completed)`);
    console.log(`- Design Phase Efficiency: ${p1Eff}% (Expected 100%)`);
    console.log(`- Development Phase Efficiency: ${p2Eff}% (Expected 0%)`);
    console.log(`- Project Efficiency: ${projEff}% (Expected Design Weight 30% * 100% = 30%)`);
    console.log(`- Team Lead Efficiency: ${tlEff}%`);

    if (cEff === 50 && p1Eff === 100 && projEff === 30) {
      console.log('\n[SUCCESS] ALL EFFICIENCY FORMULAS MATCH EXPECTED CRITERIA!');
    } else {
      console.error('\n[FAIL] Efficiency calculations deviated from expectations.');
    }

    // Clean up test records
    console.log('\nCleaning up E2E test records from database...');
    await User.deleteMany({ email: { $in: ['test_admin@trucode.com', 'test_contributor@trucode.com', 'test_lead@trucode.com'] } });
    await Department.deleteMany({ name: 'MERN Test Department' });
    await Project.deleteMany({ _id: project._id });
    await Phase.deleteMany({ project: project._id });
    await Task.deleteMany({ project: project._id });
    await ProgressLog.deleteMany({ task: { $in: [task1._id, task2._id] } });

    console.log('\n--- E2E TEST COMPLETED SUCCESSFULLY ---');
    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n[FAIL] E2E integration test failed with error:', err);
    mongoose.disconnect();
    process.exit(1);
  }
};

runE2ETest();
