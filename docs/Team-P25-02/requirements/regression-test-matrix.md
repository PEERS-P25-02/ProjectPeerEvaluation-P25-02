# PEERS Functional Regression Test Matrix

## Purpose and use

This matrix is the long-lived, sponsor-facing target for observable outcomes in the nine critical PEERS workflows. Its expected results come from the validated functional baseline and do not change when an implementation or existing test is broken. The [Requirements Traceability Matrix (RTM)](traceability/README.md) is the requirement index; this matrix supplies finite workflow scenarios to plan against. It does not report current coverage, test mappings, execution results, or defects.

The source baseline is the [validated requirements](validation/01-requirements-and-constraints.md) and [acceptance and document usage](validation/02-acceptance-and-document-usage.md), as refined by the [critical workflows](workflows/04-critical-peers-workflows.md), [workflow scope and classification](workflows/01-scope-and-classification.md), and [supporting workflows and traceability](workflows/05-supporting-workflows-and-traceability.md). Test planning follows [quality-gate policy sections 1, 3, and 4](quality-gate-policy.md), the [automated testing layers and workflows](../modernization/plans/automated-testing-strategy/02-testing-layers-and-workflows.md), and its [traceability and completion guidance](../modernization/plans/automated-testing-strategy/03-traceability-ci-and-completion.md).

Use each stable scenario ID when planning or discussing a regression check. A planned test should verify the stated outcome at an appropriate layer and use synthetic data and isolated services. Record actual test sources, run results, and retained evidence in the [testing guide](../developer-guides/testing.md) and RTM as applicable. The [internal regression coverage gap record](../modernization/implementation/testing/regression-coverage-gaps.md) is a temporary companion for implementation gaps and will be removed once those gaps are closed; retain the durable matrix, test mappings, and evidence.

The target covers CW-01 through CW-09, including the evaluation reset and relaunch lifecycle within CW-05. It excludes standalone reminder and account-support operations, MFA, automatic team assignment, AI functionality, deadline enforcement, token refresh, and multiple retained evaluation campaigns. Existing tests remain in force and must continue to pass. This catalog defines expected outcomes; it does not claim passing execution or sponsor approval. Any change to an expected outcome or scope requires explicit review against the governing requirements. Do not weaken a target to close a coverage gap.

FR-09 persistence expectations apply wherever a scenario asserts saved data or relationships. Check that the relevant course, roster, team, evaluation, or response data remains associated with its intended workflow and owner.

## Shared synthetic setup

Use isolated test data with two professor accounts (Owner and Other), two courses (Course A belongs to Owner; Course B belongs to Other), and distinct synthetic rosters and teams in each course. Use synthetic students with unique addresses routed only to a test email sink. Use the existing rubric and seed only the evaluation, token, and response state needed for each scenario; each scenario can reset its own fixture. Do not use real student information, production databases, or real email recipients. Unless a row says otherwise, actions are performed by the actor named in that workflow and data is checked in the same authorized course context.

## Priority and planned layer

Priority identifies the consequence of a regression in this target: **P1** protects a primary workflow outcome or essential evaluation-data/access integrity; **P2** protects a failure path, boundary, recovery path, or supporting invariant. Priority does not state execution frequency or current status.

The planned layer is the lowest layer expected to observe the complete outcome named in that row: **Unit** checks isolated logic; **Component** checks a rendered frontend component or page; **Integration** checks connected application boundaries such as API and database or isolated SMTP; **Browser E2E** checks a user journey through the browser and application. A layer is a planning choice, not a demand to duplicate every scenario at every layer. Representative complete instructor and student journeys may link to the applicable rows below rather than reproduce all lower-level cases.

## CW-01 — Professor authentication and authorized access (FR-01)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW01-01 | Owner signs in with valid credentials. | Authentication succeeds and the professor can reach authorized professor functions. | P1 | Browser E2E |
| REG-CW01-02 | Attempt sign-in with an incorrect password. | Authentication is rejected and no professor access is granted. | P1 | Integration |
| REG-CW01-03 | Attempt sign-in with required credentials missing. | Authentication is rejected and no professor access is granted. | P2 | Unit |
| REG-CW01-04 | Request a protected professor function without an authenticated session. | The function does not disclose or change protected professor data. | P1 | Integration |
| REG-CW01-05 | Other requests access to Course A, which belongs to Owner. | Other cannot read or modify Owner's course or its related data. | P1 | Integration |
| REG-CW01-06 | Send an invalid or expired professor access token to a protected route. | The route does not grant access or disclose/change protected data. | P1 | Integration |

## CW-02 — Course creation and management (FR-02; FR-09 for persisted course data)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW02-01 | Owner creates a course with supported course information. | The course is stored and associated with Owner. | P1 | Integration |
| REG-CW02-02 | Owner reads and manages an owned course. | Supported course information is returned and remains associated with the same owner. | P1 | Browser E2E |
| REG-CW02-03 | Owner updates supported course information. | The supported change persists without changing unrelated course or owner data. | P1 | Integration |
| REG-CW02-04 | Other attempts to read or change Course A. | Course A remains private to Owner and unchanged by Other's attempt. | P1 | Integration |
| REG-CW02-05 | Owner submits a change to a system-controlled course field. | The operation does not permit an unauthorized change to the controlled field or corrupt the course. | P2 | Integration |
| REG-CW02-06 | Owner deactivates an active course. | The course becomes inactive and is omitted from the active-course list; its roster and teams remain stored. | P1 | Integration |
| REG-CW02-07 | Owner reactivates the same inactive course. | The original course becomes active again without creating a duplicate course. | P1 | Integration |

## CW-03 — Student roster upload and processing (FR-03; SW-01; FR-09 for persisted roster data)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW03-01 | Owner uploads a CSV in the supported roster format to Course A. | Parsed students are stored in Course A with the supported information needed by later workflows. | P1 | Integration |
| REG-CW03-02 | Upload a supported CSV row containing a quoted student name with a comma and an optional group value. | The name and group are parsed into their intended fields and persisted without shifting values. | P2 | Integration |
| REG-CW03-03 | Owner uploads a CSV containing a valid student row and a malformed or incomplete student row. | The valid row is imported with correct fields and relationships; the invalid row is not persisted, its error is reported, and the upload is not represented as entirely successful. | P1 | Integration |
| REG-CW03-04 | Owner uploads a valid roster for Course A while Course B already has its own roster. | Course A receives its roster and Course B's roster remains unchanged. | P1 | Integration |
| REG-CW03-05 | An unauthorized professor attempts to upload to Course A. | Course A's roster is not disclosed or changed by the attempt. | P1 | Integration |
| REG-CW03-06 | A roster upload reports a processing failure after it has handled valid rows. | Any persisted rows retain consistent course/team relationships, and the outcome truthfully reports partial or failed processing without requiring rollback of valid rows. | P2 | Integration |
| REG-CW03-07 | Owner edits only a student's name and email after team assignment. | Updated details persist while the student's existing team membership and assignment remain intact. | P1 | Integration |
| REG-CW03-08 | Owner deletes one student who has authored and received evaluations. | The student and dependent evaluation records are removed; remaining team membership and unrelated-course data remain consistent. | P1 | Integration |
| REG-CW03-09 | Owner bulk-deletes selected Course A students while a foreign-course student ID is also supplied. | Only selected Course A students and their dependent evaluations are removed; the foreign-course student and unrelated records remain unchanged. | P1 | Integration |
| REG-CW03-10 | Owner clears the Course A roster. | Course A students, teams, and dependent evaluations are cleared and its roster/team counts reflect the empty course; Course B remains unchanged. | P1 | Integration |
| REG-CW03-11 | Owner manually adds a Course A student with an optional team assignment and another student without a team, then reads the roster. | Both students and their requested team assignments are returned and persisted correctly; course/team counts and unrelated course data remain consistent. | P1 | Integration |

## CW-04 — Student team organization (FR-04; SW-02; FR-09 for persisted relationships)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW04-01 | Owner organizes Course A students into supported teams. | Each student is associated with the intended Course A team and the relationship is persisted. | P1 | Browser E2E |
| REG-CW04-02 | Owner renames a populated team. | The new team name persists and assigned students continue to reference the same team with consistent membership and counts. | P1 | Integration |
| REG-CW04-03 | Owner organizes Course A while Course B has separate teams. | Course A team changes do not alter Course B memberships. | P1 | Integration |
| REG-CW04-04 | Team membership is read as the source for eligible peer recipients. | Recipient selection reflects the stored team membership for that course. | P1 | Integration |
| REG-CW04-05 | Owner deletes an empty team. | Only the selected empty team is removed; other teams and existing student memberships remain intact. | P2 | Integration |
| REG-CW04-06 | Owner clears Course A teams. | Course A teams are removed and its students remain in the course without stale team assignments; Course B remains unchanged. | P1 | Integration |
| REG-CW04-07 | Owner moves an assigned student from one Course A team to another. | Old and new team memberships/counts and the student's assignment agree after the move. | P1 | Integration |
| REG-CW04-08 | Owner removes one student from a team. | Only that membership is removed, the student's assignment is cleared, and remaining members stay assigned. | P1 | Integration |
| REG-CW04-09 | Owner attempts to add a Course B student to a Course A team. | No cross-course team membership is created and existing records remain unchanged. | P1 | Integration |
| REG-CW04-10 | Owner creates a named empty team and reads the Course A team list. | The new team is returned with the requested name and empty membership; stored team and course counts agree. | P1 | Integration |
| REG-CW04-11 | Owner attempts to delete a populated Course A team. | The team and its student memberships remain unchanged. | P1 | Integration |

## CW-05 — Peer-evaluation setup, launch, status, reset, and relaunch (FR-05, FR-07; SW-02, SW-03; FR-09 for persisted evaluation state)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW05-01 | Owner prepares the supported evaluation for Course A using its existing rubric and teams. | The supported launch flow uses the existing rubric and Course A team membership to identify eligible students. | P1 | Browser E2E |
| REG-CW05-02 | Owner attempts to launch an evaluation for Course A when its roster is empty. | The workflow does not present a launched evaluation with no eligible participants. | P1 | Integration |
| REG-CW05-03 | Owner launches a configured evaluation for Course A. | Launched evaluation state corresponds to Course A's eligible students and teams. | P1 | Integration |
| REG-CW05-04 | Reset evaluation state for Course A, then inspect its assigned link, submission status, responses, roster, teams, and Course B. | Course A evaluation tokens and responses are cleared, its status is pending, and its old link no longer grants evaluation access; Course A roster/teams and all Course B data remain intact. | P1 | Integration |
| REG-CW05-05 | Relaunch after resetting Course A and submit a fresh eligible evaluation. | Fresh assigned access and response submission work within the supported single-evaluation course lifecycle. | P1 | Integration |
| REG-CW05-06 | Other attempts to configure, launch, or reset Owner's evaluation. | Other cannot change Owner's evaluation state or its related course data. | P1 | Integration |
| REG-CW05-07 | Start a team-membership action that requests evaluation reset, then cancel the reset confirmation. | The reset and pending team action are canceled; no reset or membership mutation request is issued. | P1 | Component |
| REG-CW05-08 | Start a team-membership action that requests evaluation reset, then make the reset fail. | The pending team action does not proceed after reset failure; no membership mutation request is issued. | P1 | Component |
| REG-CW05-09 | After inviting Course A students, view the sent, completed, and pending evaluation status. | Per-student states and totals correspond to captured invitations and stored responses for Course A; Course B data is excluded. | P1 | Integration |
| REG-CW05-10 | Owner attempts to launch Course A using a team that belongs to Course B. | The launch does not include Course B students or create incorrect cross-course evaluation state. | P1 | Integration |

## CW-06 — Individualized evaluation link and token access (FR-06; SW-02; FR-09 for persisted token relationships)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW06-01 | An eligible student opens their assigned evaluation link. | The link opens the intended evaluation context for that student. | P1 | Browser E2E |
| REG-CW06-02 | Compare assigned links for two eligible synthetic students. | Each link resolves to its own student's intended context, not the other student's context. | P1 | Integration |
| REG-CW06-03 | Open an invalid or altered token. | The token does not grant access to an evaluation context. | P1 | Integration |
| REG-CW06-04 | Attempt to use an otherwise valid token for a different student or course context. | Access remains limited to the context assigned to that token. | P1 | Integration |

## CW-07 — Evaluation invitation distribution (FR-07; SW-02, SW-06; FR-09 for persisted token/recipient relationships)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW07-01 | Owner sends invitations for the launched Course A evaluation through isolated SMTP capture. | Invitations reach the intended eligible synthetic students and contain each recipient's assigned access token or link. | P1 | Integration |
| REG-CW07-02 | Inspect captured invitation recipients for Course A. | No ineligible student or student from Course B receives a Course A invitation. | P1 | Integration |
| REG-CW07-03 | The configured SMTP service fails while invitations are sent. | The outcome reports delivery failure truthfully; the invitation is not represented as successfully delivered. | P1 | Integration |
| REG-CW07-04 | Run the invitation scenario in the test environment. | Messages are captured by the isolated test sink and do not reach real recipients. | P1 | Integration |

## CW-08 — Student peer-evaluation submission (FR-08; SW-02, SW-03; FR-09 for persisted responses)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW08-01 | Student submits a complete valid evaluation for eligible peers. | The submission is stored once and associated with the correct evaluator, recipients, course, and evaluation. | P1 | Browser E2E |
| REG-CW08-02 | Student includes themself as an evaluation recipient. | No self-evaluation is persisted. | P1 | Integration |
| REG-CW08-03 | Student includes a recipient outside their eligible peer set. | No unauthorized recipient evaluation is persisted. | P1 | Integration |
| REG-CW08-04 | Student submits the same peer recipient more than once in one submission. | Duplicate recipient entries do not create duplicate or inconsistent response data. | P1 | Integration |
| REG-CW08-05 | Student repeats a completed submission. | Repetition does not create duplicate response data or corrupt the previously stored submission. | P1 | Integration |
| REG-CW08-06 | Two submissions for the same evaluation context arrive concurrently. | Resulting stored response data remains consistent and does not contain duplicate or partial evaluations. | P1 | Integration |
| REG-CW08-07 | A submission contains an invalid later entry after an otherwise valid entry. | The failed submission does not leave earlier entries persisted as a partial evaluation. | P1 | Integration |
| REG-CW08-08 | Student submits using an invalid token. | No evaluation response is accepted or persisted for the invalid token. | P1 | Integration |
| REG-CW08-09 | Student submits an empty evaluation form. | Submission is rejected and no response or completion change is persisted. | P1 | Integration |
| REG-CW08-10 | Student submits a peer evaluation with a required rating missing. | Submission is rejected and no response or completion change is persisted. | P1 | Integration |
| REG-CW08-11 | Student submits a rating outside that rubric criterion's displayed choices. | Submission is rejected and no response or completion change is persisted. | P1 | Integration |
| REG-CW08-12 | Student submits feedback shorter than the documented minimum. | Submission is rejected and no response or completion change is persisted. | P1 | Integration |
| REG-CW08-13 | A student fills the form, receives a failed submission response, then retries after the request can succeed. | Entered form data remains available for correction/retry, and a subsequent valid submission can be completed. | P2 | Component |

## CW-09 — Evaluation results review and export (FR-10; SW-02, SW-05; FR-09 for persisted source data)

| Scenario | Scenario and action | Observable expected result | Priority | Planned layer |
| --- | --- | --- | --- | --- |
| REG-CW09-01 | Owner reviews Course A results after valid submissions exist. | Displayed results and supported aggregation reflect the stored Course A submissions. | P1 | Browser E2E |
| REG-CW09-02 | Owner exports the supported Course A report. | Exported report or CSV contains the supported Course A results and agrees with the stored submissions. | P1 | Integration |
| REG-CW09-03 | Other requests Course A results or export. | Course A evaluation data is not disclosed to Other. | P1 | Integration |
| REG-CW09-04 | Owner reviews and exports results when an expected response record is missing from the stored source data. | The result does not invent a response or misattribute values; displayed/exported data remains tied to stored records. | P1 | Integration |
| REG-CW09-05 | Course A and Course B have distinct stored evaluation results. | Course A review and export contain Course A data only and preserve course ownership boundaries. | P1 | Integration |
| REG-CW09-06 | Independently calculate Course A results from its stored responses and compare them with the supported mean and curved report modes. | Displayed scores, aggregates, and selected grading mode agree with the independently calculated fixture results. | P1 | Integration |
| REG-CW09-07 | Download a Course A report where a synthetic student name contains a comma and a quote, then inspect the browser download. | The browser downloads the selected course's CSV; the special-character name remains one valid CSV field and row data matches the report. | P1 | Browser E2E |
| REG-CW09-08 | Owner views a student report, a team report, and the generated Course A report. | Student and team views show their scoped results, and the generated course summary agrees with course results; all values come from stored responses without changing source records. | P1 | Integration |

## Representative browser journeys

Use focused browser journeys to show connected outcomes without duplicating every row as a browser test. An instructor journey can connect REG-CW01-01, REG-CW02-01/02, REG-CW03-01, REG-CW04-01, REG-CW05-01/03, REG-CW07-01, and REG-CW09-01/02. A student journey can connect REG-CW06-01 and REG-CW08-01. Keep individual rows as independently verifiable targets at their planned layers; a journey passing does not substitute for every linked outcome unless it observes that outcome.
