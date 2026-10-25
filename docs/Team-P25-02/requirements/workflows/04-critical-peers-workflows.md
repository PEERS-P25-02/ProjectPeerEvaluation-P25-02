<a id="section-7"></a>

# 4. Critical PEERS Workflows

Each critical workflow below is described in terms of the behavior that must remain observable after modernization. The preservation acceptance criteria are intentionally high-level; detailed automated test cases and test-layer decisions will be defined in the Automated Testing Strategy.

<a id="section-8"></a>

## 4.1 CW-01 - Professor Authentication and Authorized Access

| Primary Actor | Professor |
| --- | --- |
| Related Baseline | FR-01 - Authorized professor authentication and access to professor functions. |
| Prerequisites | A professor account exists, and the backend, authentication configuration, and database are available. |
| Expected Outcome | A professor with valid credentials can authenticate and access authorized professor functions. Invalid credentials do not grant access. |
| Important Failure Cases | Invalid login handling; missing or invalid authentication configuration; unauthorized access to another professor's course or related data. |
| Preservation Acceptance Criteria | Valid professor authentication continues to succeed, invalid authentication is rejected, and authenticated access remains limited to the professor's authorized resources. |

<a id="section-9"></a>

## 4.2 CW-02 - Course Creation and Management

| Primary Actor | Professor |
| --- | --- |
| Related Baseline | FR-02 - Professor course creation and management. |
| Prerequisites | The professor is authenticated and authorized to access professor functions. |
| Expected Outcome | The professor can create and manage a course, and the course remains associated with the correct professor. |
| Important Failure Cases | Unauthorized course access or modification; unrestricted updates to system-controlled fields; failed or inconsistent course persistence. |
| Preservation Acceptance Criteria | Supported course creation and management operations continue to function for the owning professor without permitting cross-professor access or corruption of course state. |

<a id="section-10"></a>

## 4.3 CW-03 - Student Roster Upload and Processing

| Primary Actor | Professor |
| --- | --- |
| Related Baseline | FR-03 - CSV roster upload and processing. |
| Prerequisites | An authorized professor has an existing course and provides a supported CSV roster. |
| Expected Outcome | Supported roster data is parsed and associated with the correct course, so students can participate in later team evaluation workflows. |
| Important Failure Cases | Invalid or malformed roster data; processing that leaves incomplete or inconsistent student records; roster changes that unintentionally damage existing course data. |
| Preservation Acceptance Criteria | A valid supported roster continues to load into the intended course with the student information required by downstream team and evaluation workflows. |

<a id="section-11"></a>

## 4.4 CW-04 - Student Team Organization

| Primary Actor | Professor |
| --- | --- |
| Related Baseline | FR-04 - Students can be organized into course teams. |
| Prerequisites | The course and student roster exist. |
| Expected Outcome | Students are associated with the intended course teams, and those relationships are available to the evaluation workflow. |
| Important Failure Cases | Team membership becomes inconsistent between stored student and team data; students are associated with the wrong team; team data prevents correct peer-recipient selection. |
| Preservation Acceptance Criteria | Supported team organizations continue to produce consistent team membership used by later evaluation workflows. This workflow does not include the out-of-scope automatic team-assignment feature. |

<a id="section-12"></a>

## 4.5 CW-05 - Peer-Evaluation Activity Setup and Launch

| Primary Actor | Professor |
| --- | --- |
| Related Baseline | FR-05 - Professor creation and distribution of a peer-evaluation activity. |
| Prerequisites | The professor is authenticated; the course, roster, and required team information exist. |
| Expected Outcome | The professor can prepare and launch the supported peer-evaluation activity using the existing PEERS workflow. |
| Important Failure Cases | Evaluation activity cannot be launched; required course/team information is missing or inconsistent; launch behavior produces incorrect participants or invalid downstream state. |
| Preservation Acceptance Criteria | The supported evaluation setup and launch workflow continues to create the state needed for eligible students to receive and complete evaluations. |

<a id="section-13"></a>

## 4.6 CW-06 - Individualized Evaluation Link / Token Access

| Primary Actor | Student / System |
| --- | --- |
| Related Baseline | FR-06 - Individualized evaluation access links or tokens for eligible students. |
| Prerequisites | An evaluation activity has been launched, and the student is eligible to participate. |
| Expected Outcome | The system provides an individualized access link or token that opens the intended student evaluation context. |
| Important Failure Cases | Invalid or weak token handling; token exposure in logs; a token opens the wrong student/course context; invalid tokens are accepted. |
| Preservation Acceptance Criteria | Eligible students can continue to reach the correct evaluation workflow through their assigned access link, while invalid or unauthorized access is rejected. |

<a id="section-14"></a>

## 4.7 CW-07 - Evaluation Invitation Distribution

| Primary Actor | Professor / System |
| --- | --- |
| Related Baseline | FR-07 - Evaluation invitations and reminders through the configured email service. |
| Prerequisites | Eligible students and individualized evaluation links exist; the configured email service is available. |
| Expected Outcome | Evaluation invitations are sent to the intended eligible students with usable evaluation access information. |
| Important Failure Cases | SMTP delivery failure; invitation status indicates success when delivery failed; incorrect recipients receive messages; staging activity contacts unintended real users. |
| Preservation Acceptance Criteria | The supported invitation workflow continues to address the intended students and provides valid evaluation access. Staging validation must use approved safe email behavior. |

<br>

<a id="section-15"></a>

## 4.8 CW-08 - Student Peer-Evaluation Submission

| Primary Actor | Student |
| --- | --- |
| Related Baseline | FR-08 - Student peer-evaluation submission through the assigned link. |
| Prerequisites | The student has a valid evaluation link/token and an eligible peer-recipient set for the course/team. |
| Expected Outcome | The student can complete and submit the required peer evaluations, and the resulting evaluation data is stored once and associated with the correct course, evaluator, and recipients. |
| Important Failure Cases | Partial saves; invalid or unauthorized recipients; self-evaluation; duplicate recipient entries; repeated/concurrent submissions; invalid token use. |
| Preservation Acceptance Criteria | A valid submission completes successfully and produces consistent evaluation records; invalid or duplicate submissions do not create incorrect or partial evaluation state. |

<a id="section-16"></a>

## 4.9 CW-09 - Evaluation Results Review and Export

| Primary Actor | Professor |
| --- | --- |
| Related Baseline | FR-10 - Professor review and export of supported evaluation results and reports. |
| Prerequisites | The professor is authenticated and evaluation data exists for an authorized course. |
| Expected Outcome | The professor can review supported aggregated evaluation results and export available report output for the correct course. |
| Important Failure Cases | Incorrect aggregation; missing or inconsistent evaluation data; cross-course or cross-professor access; report output does not reflect stored submissions. |
| Preservation Acceptance Criteria | Supported report and export behavior continues to produce results derived from the correct authorized course and its stored evaluation data. |

<br>
