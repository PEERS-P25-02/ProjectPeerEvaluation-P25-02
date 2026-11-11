# Functional Requirements

## 1. Authentication & Authorization
- FR1.1: System shall provide secure login for professors using university credentials
- FR1.2: System shall provide unique evaluation links for students (no login required)
- FR1.3: System shall support multi-factor authentication for professors
- FR1.4: System shall maintain session management with 30-minute timeout

## 2. Course Management
- FR2.1: Professors shall create multiple courses with unique identifiers
- FR2.2: System shall support bulk roster upload via CSV/Excel
- FR2.3: System shall validate email formats and duplicate entries
- FR2.4: Professors shall assign students to teams within courses

## 3. Evaluation Management
- FR3.1: System shall generate unique evaluation forms per student
- FR3.2: System shall send personalized email invitations with secure links
- FR3.3: System shall track evaluation completion status
- FR3.4: System shall send automated reminders for incomplete evaluations

## 4. Data Collection
- FR4.1: System shall collect numeric ratings (1-5 scale)
- FR4.2: System shall collect textual feedback (min 50, max 500 characters)
- FR4.3: System shall timestamp all submissions
- FR4.4: System shall prevent duplicate submissions

## 5. Reporting
- FR5.1: System shall generate aggregated team reports
- FR5.2: System shall calculate average scores per criterion
- FR5.3: System shall provide downloadable reports (PDF, CSV)
- FR5.4: System shall highlight outliers and discrepancies

## 6. AI Features (Optional)
- FR6.1: System may summarize textual feedback using NLP
- FR6.2: System may flag concerning language or patterns
- FR6.3: System may identify sentiment trends
