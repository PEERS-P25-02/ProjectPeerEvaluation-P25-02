# Student Roster CSV Format

The course roster upload accepts a CSV file with a header row:

```csv
student_id,name,email,team_name
S001,Jordan Lee,jordan.lee@example.edu,Team A
S002,Casey Chen,casey.chen@example.edu,
```

`student_id`, `name`, and `email` are required for each row. `team_name` is optional. The backend also accepts `group_assignment` and `group` as alternatives. It uses the first nonempty value in this order: `team_name`, `group_assignment`, `group`.

Rows missing required values are reported as errors. Existing student IDs are not inserted again, but a nonempty team assignment in the file may be applied to an existing student. A blank team field does not clear an existing assignment.

**Uploading a roster clears the course's existing evaluation records and invitation tokens.**

In the Manage Students dialog, choose **Upload CSV**, select the file, and review the upload results and row errors.
