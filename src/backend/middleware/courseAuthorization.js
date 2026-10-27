const mongoose = require('mongoose');
const Course = require('../models/Course');

exports.requireCourseOwner = async (req, res, next, courseId) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    const err = new Error('Invalid course ID.');
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    return next(err);
  }

  try {
    // Resolve ownership before route handlers perform scoped work or side effects.
    const course = await Course.findOne({
      _id: courseId,
      professor_id: req.user.id,
    });
    if (!course) {
      const err = new Error('Course not found.');
      err.code = 'NOT_FOUND';
      err.status = 404;
      return next(err);
    }
    req.course = course;
    next();
  } catch (err) {
    err.code = err.code || 'SERVER_ERROR';
    err.status = err.status || 500;
    next(err);
  }
};
