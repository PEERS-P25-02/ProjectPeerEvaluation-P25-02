const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const authMiddleware = require('../middleware/authMiddleware');

// Sample data for generating random courses
const courseNames = [
  'Software Engineering',
  'Data Structures and Algorithms',
  'Database Management Systems',
  'Web Development',
  'Machine Learning',
  'Computer Networks',
  'Operating Systems',
  'Artificial Intelligence',
  'Cybersecurity',
  'Mobile App Development',
];

const courseCodes = ['CS', 'CIS', 'IT', 'SE', 'EE', 'CE'];
const sections = ['01', '02', '03', 'A', 'B', 'C'];
const semesters = ['Fall 2024', 'Spring 2025', 'Summer 2025', 'Fall 2025'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomCourse(professorId) {
  const courseName = getRandomElement(courseNames);
  const courseCode = getRandomElement(courseCodes);
  const courseNumber = Math.floor(Math.random() * 9000) + 1000;
  const section = getRandomElement(sections);
  const semester = getRandomElement(semesters);

  return {
    course_name: courseName,
    course_number: `${courseCode} ${courseNumber}`,
    course_section: section,
    semester: semester,
    professor_id: new mongoose.Types.ObjectId(professorId),
    course_status: 'Active',
    student_count: Math.floor(Math.random() * 40) + 15,
    team_count: Math.floor(Math.random() * 10) + 4,
    evaluation_status: {
      total: 0,
      completed: 0,
      pending: 0,
    },
  };
}

// Load test data endpoint (protected by auth)
router.post('/load-test-data', authMiddleware, async (req, res) => {
  try {
    console.log('📋 Loading test data for professor:', req.professor.id);

    console.log('📚 Generating 10 random courses...');
    const courses = [];

    for (let i = 0; i < 10; i++) {
      courses.push(generateRandomCourse(req.professor.id));
    }

    console.log('💾 Inserting courses into database...');
    const insertedCourses = await Course.insertMany(courses);

    console.log(`✅ Successfully added ${insertedCourses.length} courses`);

    res.status(200).json({
      success: true,
      message: `Successfully loaded ${insertedCourses.length} test courses`,
      courses: insertedCourses.map((course) => ({
        course_name: course.course_name,
        course_number: course.course_number,
        course_section: course.course_section,
        semester: course.semester,
      })),
    });
  } catch (error) {
    console.error('❌ Error loading test data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load test data',
      error: error.message,
    });
  }
});

module.exports = router;
