# Trucode Operational Performance Dashboard (TOPD)

A comprehensive project and task management platform with role-based access control, performance analytics, and real-time notifications.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [User Roles](#user-roles)
- [API Endpoints](#api-endpoints)
- [Scripts](#scripts)

## Features

### Core Features
- **User Authentication & Authorization**: Secure login/register with JWT tokens and role-based permissions
- **Role-based Dashboards**: Different interfaces for Super Admin, Management, Team Lead, and Contributor
- **Project Management**: Create, update, and manage projects with phases and tasks
- **Task Management**: Detailed task tracking with status, priority, dependencies, and blockers
- **Daily Status Updates**: Contributors and team leads can add daily status updates for tasks
- **Efficiency Analytics**: Personal and project-wise efficiency metrics with visual charts
- **Reports Generation**: Export reports to PDF and Excel (daily, weekly, monthly)
- **Real-time Notifications**: Socket.io based real-time alerts for task updates
- **Department Management**: Organize users by departments
- **Audit Logs**: Track all system activities
- **Responsive Design**: Mobile-friendly UI

### User-Specific Features

#### Super Admin
- Manage all users and departments
- Approve/reject user access
- View all projects and tasks
- System-wide analytics and reports
- Task status distribution charts
- Latest leads/contributors overview

#### Management
- View all projects and tasks
- Efficiency metrics for all teams
- Task status distribution
- Generate and export reports
- Approve/reject user access

#### Team Lead
- Create and manage projects
- Assign tasks to contributors
- View assigned projects and tasks
- Add daily status updates
- Efficiency metrics
- Block tasks when needed

#### Contributor
- View assigned tasks
- Update task status and completion
- Add daily status updates
- Personal efficiency dashboard
- Project-wise efficiency
- Block tasks with reasons

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Socket.io** - Real-time communication
- **bcryptjs** - Password hashing

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Redux Toolkit** - State management
- **Material UI** - UI components
- **Recharts** - Charts
- **jsPDF** - PDF generation
- **XLSX** - Excel export
- **Socket.io-client** - Real-time client

## Project Structure

```
trucode-dashboard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── server.js         # Server configuration
│   │   ├── controllers/         # Business logic
│   │   ├── middlewares/         # Auth and other middlewares
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business services
│   │   ├── socket/              # Socket.io configuration
│   │   └── utils/               # Utility functions
│   ├── scripts/
│   │   ├── seedSuperadmin.js    # Create super admin
│   │   ├── seedDemoData.js      # Seed demo data
│   │   └── resetDatabase.js     # Reset database
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/               # Page components
    │   ├── layouts/             # Layout components
    │   ├── redux/               # Redux store and slices
    │   ├── routes/              # Routing configuration
    │   ├── services/            # API service
    │   ├── contexts/            # React contexts
    │   └── styles/              # Global styles
    ├── public/
    ├── .env.example
    └── package.json
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

## Database Setup

1. Start MongoDB locally or use your MongoDB Atlas connection string

2. Create super admin:
```bash
cd backend
npm run admin
```

3. (Optional) Seed demo data:
```bash
npm run seed
```

4. (Optional) Reset database:
```bash
npm run reset
```

## Running the Application

### Start Backend
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:5000`

### Start Frontend
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

### Production Build

#### Backend
```bash
cd backend
npm start
```

#### Frontend
```bash
cd frontend
npm run build
npm run preview
```

## Default Credentials

After running `npm run admin`, you can login with:
- **Email**: admin@example.com
- **Password**: Password@123

## User Roles

| Role | Description |
|------|-------------|
| **SUPER_ADMIN** | Full system access, user management, approvals |
| **MANAGEMENT** | View all projects, reports, analytics, approvals |
| **TEAM_LEAD** | Create projects, assign tasks, manage team |
| **CONTRIBUTOR** | View and update assigned tasks, daily statuses |
| **NORMAL_USER** | Pending approval, limited access |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `PUT /api/users/:id/assign-role` - Assign role to user
- `DELETE /api/users/:id` - Delete user

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/day-status` - Add daily status
- `DELETE /api/tasks/:id/day-status/:statusId` - Delete daily status

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Phases
- `GET /api/phases` - Get all phases
- `POST /api/phases` - Create phase
- `PUT /api/phases/:id` - Update phase
- `DELETE /api/phases/:id` - Delete phase

### Dashboard
- `GET /api/dashboard/superadmin` - Super Admin dashboard
- `GET /api/dashboard/management` - Management dashboard
- `GET /api/dashboard/teamlead` - Team Lead dashboard
- `GET /api/dashboard/contributor` - Contributor dashboard

### Reports
- `GET /api/reports/efficiency` - Efficiency report
- `GET /api/reports/tasks` - Tasks report

## Scripts

### Backend Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run admin` - Create super admin user
- `npm run seed` - Seed demo data
- `npm run reset` - Reset database

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Refresh token mechanism
- Role-based authorization
- Protected API routes
- CORS configuration

## License

ISC
