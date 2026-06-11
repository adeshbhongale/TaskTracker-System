const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middlewares/auth');

// Controllers
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const departmentController = require('../controllers/departmentController');
const projectController = require('../controllers/projectController');
const phaseController = require('../controllers/phaseController');
const taskController = require('../controllers/taskController');
const dashboardController = require('../controllers/dashboardController');
const reportController = require('../controllers/reportController');

// 1. Authentication Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// 2. User Routes (Super Admin)
router.get('/users', authenticate, userController.getUsers);
router.patch('/assign-role', authenticate, requireRole('SUPER_ADMIN'), userController.assignRole);
router.patch('/assign-department', authenticate, requireRole('SUPER_ADMIN'), userController.assignDepartment);
router.delete('/users/:userId', authenticate, requireRole('SUPER_ADMIN'), userController.deactivateUser);
router.post('/users/reset-password', authenticate, requireRole('SUPER_ADMIN'), userController.resetPassword);
router.patch('/users/:userId', authenticate, requireRole('SUPER_ADMIN'), userController.updateUserPersonalInfo);
router.get('/users/:userId', authenticate, userController.getUserById);
router.get('/users/:userId/efficiency', authenticate, userController.getUserEfficiency);

// 3. Department Routes (Super Admin CRUD, authenticated read)
router.post('/departments', authenticate, requireRole('SUPER_ADMIN'), departmentController.createDepartment);
router.put('/departments/:id', authenticate, requireRole('SUPER_ADMIN'), departmentController.editDepartment);
router.delete('/departments/:id', authenticate, requireRole('SUPER_ADMIN'), departmentController.deleteDepartment);
router.get('/departments', authenticate, departmentController.listDepartments);

// 4. Project Routes
router.post('/projects', authenticate, requireRole('TEAM_LEAD'), projectController.createProject);
router.get('/projects', authenticate, projectController.getProjects);
router.get('/projects/:id', authenticate, projectController.getProjectById);
router.put('/projects/:id', authenticate, requireRole(['TEAM_LEAD', 'SUPER_ADMIN']), projectController.updateProject);
router.delete('/projects/:id', authenticate, requireRole(['TEAM_LEAD', 'SUPER_ADMIN']), projectController.deleteProject);

// 5. Phase Routes
router.post('/phases', authenticate, requireRole('TEAM_LEAD'), phaseController.createPhase);
router.get('/phases/project/:projectId', authenticate, phaseController.getPhasesByProject);
router.put('/phases/:id', authenticate, requireRole('TEAM_LEAD'), phaseController.updatePhase);
router.delete('/phases/:id', authenticate, requireRole('TEAM_LEAD'), phaseController.deletePhase);

// 6. Task Routes
router.post('/tasks', authenticate, requireRole(['TEAM_LEAD', 'SUPER_ADMIN']), taskController.createTask);
router.get('/tasks', authenticate, taskController.getTasks);
router.get('/tasks/:id', authenticate, taskController.getTaskById);
router.put('/tasks/:id', authenticate, requireRole(['CONTRIBUTOR', 'TEAM_LEAD', 'SUPER_ADMIN']), taskController.updateTask);
router.put('/tasks/:id/status', authenticate, requireRole(['CONTRIBUTOR', 'TEAM_LEAD', 'SUPER_ADMIN']), taskController.updateTaskStatus);
router.post('/tasks/:id/blockers', authenticate, requireRole(['CONTRIBUTOR', 'TEAM_LEAD', 'SUPER_ADMIN']), taskController.addBlocker);
router.post('/tasks/:id/day-statuses', authenticate, requireRole(['TEAM_LEAD', 'CONTRIBUTOR']), taskController.addDayStatus);
router.delete('/tasks/:id/day-statuses/:statusId', authenticate, taskController.deleteDayStatus);
router.post('/tasks/:taskId/assign', authenticate, requireRole(['TEAM_LEAD', 'SUPER_ADMIN']), taskController.assignContributors);
router.delete('/tasks/:id', authenticate, requireRole(['TEAM_LEAD', 'SUPER_ADMIN']), taskController.deleteTask);

// 8. Dashboard Routes
router.get('/dashboard/overview', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), dashboardController.getOverviewMetrics);
router.get('/dashboard/efficiency', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), dashboardController.getResourceEfficiencyTable);
router.get('/dashboard/lead', authenticate, requireRole('TEAM_LEAD'), dashboardController.getTeamLeadDashboard);
router.get('/dashboard/contributor', authenticate, requireRole('CONTRIBUTOR'), dashboardController.getContributorDashboard);

// 9. Reports Routes
router.get('/reports/projects', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), reportController.getProjectPerformanceReport);
router.get('/reports/contributors', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), reportController.getContributorEfficiencyReport);
router.get('/reports/team-leads', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), reportController.getTeamLeadEfficiencyReport);
router.get('/reports/blockers', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), reportController.getBlockerReport);
router.get('/reports/delays', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), reportController.getDelayReport);
router.get('/reports/completions', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), reportController.getTaskCompletionReport);
router.get('/reports/aging', authenticate, requireRole(['SUPER_ADMIN', 'MANAGEMENT']), reportController.getTaskAgingReport);

// 10. Notification Routes
router.get('/notifications', authenticate, userController.getUserNotifications);
router.patch('/notifications/:id/read', authenticate, userController.markNotificationRead);

module.exports = router;

