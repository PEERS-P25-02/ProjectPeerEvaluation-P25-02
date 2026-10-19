const mongoose = require('mongoose');
const Student = require('./models/Student');

async function checkStudent() {
  try {
    await mongoose.connect('mongodb://localhost:27017/peer-eval');
    console.log('Connected to MongoDB');

    const students = await Student.find({
      course_id: '68eefb8a74651b053373f073',
    });
    console.log('Students found:', students.length);

    students.forEach((student, index) => {
      console.log(`\nStudent ${index + 1}:`);
      console.log('_id:', student._id);
      console.log('student_id:', student.student_id);
      console.log('name:', student.name);
      console.log('email:', student.email);
      console.log('group_assignment:', student.group_assignment);
      console.log('Full object:', JSON.stringify(student, null, 2));
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudent();
