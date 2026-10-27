const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const studentController = require('../controllers/studentController');

const teamController = require('../controllers/teamController');

const evaluationController = require('../controllers/evaluationController');

const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireCourseOwner } = require('../middleware/courseAuthorization');

router.use(authenticateToken);
router.param('course_id', requireCourseOwner);

// Course management endpoints
router.get('/', courseController.listCourses);
router.post('/', courseController.createCourse);
router.post('/migrate', courseController.migrateCourses); // Migration endpoint
router.get('/:course_id', courseController.getCourse);
router.put('/:course_id', courseController.updateCourse);
router.delete('/:course_id', courseController.deleteCourse);

// Student roster endpoints (subroutes)
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
router.post(
  '/:course_id/roster',
  (req, res, next) => {
    console.log('--- /:course_id/roster route hit ---');
    next();
  },
  upload.single('file'),
  studentController.uploadRoster,
);
router.get('/:course_id/students', studentController.listStudents);
router.post('/:course_id/students', studentController.addStudent); // Manual add
router.put('/:course_id/students/:student_id', studentController.updateStudent);
router.delete(
  '/:course_id/students/:student_id',
  studentController.deleteStudent,
);
router.post(
  '/:course_id/students/bulk-delete',
  studentController.bulkDeleteStudents,
);
router.delete('/:course_id/students', studentController.deleteAllStudents); // Delete ALL students

// Reporting endpoints (subroutes)
router.get('/:course_id/reports', reportController.getCourseReport);
router.get('/:course_id/reports/download', reportController.downloadReport);
router.get(
  '/:course_id/reports/student/:student_id',
  reportController.getStudentReport,
);
router.get('/:course_id/reports/team/:team_id', reportController.getTeamReport);
router.post('/:course_id/reports/generate', reportController.generateReport);
// Evaluation endpoints (subroutes)
router.post(
  '/:course_id/evaluations/send',
  evaluationController.sendEvaluations,
);
// Send evaluations to a specific team
router.post(
  '/:course_id/teams/:team_id/evaluations/send',
  evaluationController.sendTeamEvaluations,
);
router.get(
  '/:course_id/evaluations/status',
  evaluationController.evaluationStatus,
);
router.post(
  '/:course_id/evaluations/remind',
  evaluationController.remindEvaluations,
);
router.delete(
  '/:course_id/evaluations/reset',
  studentController.resetEvaluationState,
);
// Team management endpoints (subroutes)
router.get('/:course_id/teams', teamController.listTeams);
router.post('/:course_id/teams', teamController.createTeams);
router.put('/:course_id/teams/:team_id', teamController.updateTeam);
router.delete('/:course_id/teams/:team_id', teamController.deleteTeam);
router.delete('/:course_id/teams', teamController.clearAllTeams); // Clear all teams
router.post('/:course_id/teams/auto-assign', teamController.autoAssignTeams);
router.post(
  '/:course_id/teams/:team_id/students/:student_id',
  teamController.addStudentToTeam,
);
router.delete(
  '/:course_id/teams/:team_id/students/:student_id',
  teamController.removeStudentFromTeam,
);

module.exports = router;
