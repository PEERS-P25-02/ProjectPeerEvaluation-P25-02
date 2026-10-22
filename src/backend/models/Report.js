const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  generated_at: { type: Date, default: Date.now },
  summary: {
    total_students: Number,
    evaluations_completed: Number,
    average_rating: Number,
    completion_rate: Number,
  },
  team_reports: [Object],
  student_reports: [Object],
  ai_insights: Object,
});

module.exports = mongoose.model('Report', ReportSchema);
