<a id="05-supporting-peers-workflows"></a>

<a id="section-17"></a>

# 5. Supporting PEERS Workflows

The following supporting workflows contribute to one or more critical workflows. They are documented separately because they are enabling behaviors rather than independent primary user goals. Their required preservation is determined by the critical workflows they support.

| ID | Supporting Workflow | Supports | Why It Matters | Preservation Expectation |
| --- | --- | --- | --- | --- |
| SW-01 | CSV Parsing and Roster Validation | CW-03 | Processes supported roster input into usable student data and prevents malformed input from undermining the roster workflow. | Preserve the parsing/validation behavior required for supported roster uploads. |
| SW-02 | Application Data Persistence and Relationship Consistency | CW-02 through CW-09 | Stores course, roster, team, evaluation, and response data in MongoDB and maintains relationships required by later workflows. | Preserve correct persistence and the data relationships required by the critical workflow chain. |
| SW-03 | Rubric / Evaluation Configuration | CW-05 and CW-08 | Supports preparation of the evaluation activity and the fields students complete during peer evaluation. | Preserve the configuration behavior required by the currently supported evaluation workflow. |
| SW-04 | Evaluation Reminder Distribution | CW-07 and CW-08 | Provides follow-up messages to incomplete students using the configured email service. | Preserve supported reminder behavior where it is part of the approved email workflow; incorrect recipient selection must not be introduced. |
| SW-05 | Evaluation Aggregation and Calculation | CW-09 | Transforms stored evaluation data into the summaries and report values presented to professors. | Preserve the calculations and aggregation required for supported reporting behavior. |
| SW-06 | SMTP Email Delivery Integration | CW-07 and SW-04 | Provides the external communication channel used for invitations, reminders, and related supported email behavior. | Preserve the email integration required by approved workflows; broader architectural redesign of email delivery is not required unless necessary to preserve those workflows. |

<br>

<a id="06-modernization-workflows"></a>

<a id="section-18"></a>

# 6. Modernization Workflows

Modernization workflows are separated from PEERS functional workflows because they are new engineering processes introduced by this capstone rather than inherited professor or student business behavior. They are nevertheless required project workflows because they provide the automated controls used to preserve and validate the application.

| ID | Modernization Workflow | Primary Actor | Required Outcome | Related Requirement |
| --- | --- | --- | --- | --- |
| MW-01 | Repeatable Environment Setup | Developer / Maintainer | Documented setup and container configuration initialize the frontend, backend, MongoDB connection, and required supporting services in a repeatable manner. | FR-11, FR-12 |
| MW-02 | Automated CI Validation | Developer / GitHub Actions | A pushed commit or pull request triggers dependency installation, build, lint/format checks, automated tests, dependency validation, and security scanning. | FR-13 through FR-18 |
| MW-03 | Pull Request Quality Gate and Merge Control | Developer / Reviewers / GitHub | Changes targeting main cannot be merged until the required validation checks pass, and the applicable branch-protection requirements are satisfied. | FR-19, FR-20 |
| MW-04 | Automated Staging Deployment | GitHub Actions / Staging Platform | A successful approved change is deployed automatically to the separate staging environment. | FR-21 |
| MW-05 | Post-Deployment Validation | CI/CD Pipeline | After staging deployment, health checks and selected smoke validation confirm application availability, database connectivity, and selected critical workflow usability. | FR-22 |
| MW-06 | Pipeline and Deployment Evidence | CI/CD Pipeline / Maintainer | Logs or reports retain evidence of build, test, dependency/security, and deployment results for review and demonstration. | FR-23 |

<br>

<a id="07-excluded-and-unsupported-workflows"></a>

<a id="section-19"></a>

# 7. Excluded and Unsupported Workflows

The following items are not part of the current functional-preservation baseline or approved implementation scope. They are documented so that incomplete or unsupported functionality is not mistakenly treated as a required workflow during modernization.

| Excluded / Unsupported Workflow | Current Status | Scope Basis |
| --- | --- | --- |
| MFA Verification | Incomplete functionality | Explicitly rejected from the current project scope. |
| Automatic Team Assignment | Incomplete functionality | Explicitly rejected from the current project scope. Supported team organization remains part of the preserved baseline. |
| AI-Assisted Application Functionality | Incomplete / placeholder functionality | Explicitly rejected from the current project scope and not required by the project specification. |
| Evaluation Deadline Enforcement | Behavior not established as part of the approved baseline | Documented as an out-of-scope limitation. |
| Token Refresh | Incomplete endpoint / unsupported path | Not identified in the approved functional baseline or CI/CD requirements. |
| Multiple Evaluation Campaign / Historical Lifecycle Support | Current lifecycle does not clearly support multiple retained campaigns per course | Adding a new multi-campaign lifecycle would expand application functionality beyond the current modernization scope. |
| Production Hosting / Production Deployment Automation | Not part of the staging modernization workflow | The approved project scope is limited to automated staging deployment; production hosting and release automation are outside scope. |

<a id="08-relationship-to-testing-and-traceability"></a>

<a id="section-20"></a>

# 8. Relationship to Testing and Traceability

Critical workflows identified here will provide the functional basis for regression and representative end-to-end validation. Supporting workflows will be tested to the extent necessary to verify the critical workflows they enable. Exact test layers, tools, scenarios, fixtures, failure-path coverage, and execution rules will be defined in the Automated Testing Strategy rather than in this document. The Requirements Traceability Matrix will link the approved functional requirements and critical workflows to the automated tests that verify them. Modernization-workflow validation will also be reflected in the CI/CD Architecture Design and related milestone evidence.
