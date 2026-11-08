# Instructions

Both RTM sections use the same six columns. A dash means no traceability ID or evidence link is recorded.

<table>
<tr>
<td>Field / Topic</td>
<td>Guidance</td>
</tr>
<tr>
<td>Requirement IDs</td>
<td>FR-## identifies functional requirements; NFR-## identifies nonfunctional requirements.</td>
</tr>
<tr>
<td>Traceability IDs</td>
<td>TC-UNIT-FE-*, TC-UNIT-BE-*, TC-INT-*, and TC-E2E-* identify maintained automated test-case definitions in the <a href="../../modernization/implementation/testing/README.md">testing records</a>. UNIT-CI-* identifies historical command-verification checks; CI-* identifies historical CI verification cases (<a href="https://github.com/PEERS-P25-02/ProjectPeerEvaluation-P25-02/blob/09cd15b6e1da1c11ed2269847eb1f8f178f15680/docs/Team-P25-02/modernization/implementation/continuous-integration.md#2-verification-cases">original definitions</a>). Interpret both within their original scope and date. REG-CW* identifies a functional regression target, not an execution result. OP-33-* identifies an API operation in the <a href="../../modernization/implementation/testing/api-database-operation-inventory.md">operation inventory</a>, not a test case or RTM verification reference. TC-VER-* is reserved for a documented manual verification procedure if one is added later; do not assign an ID before writing the procedure.</td>
</tr>
<tr>
<td>Verification Method</td>
<td>Select the method used to establish that the requirement is satisfied.</td>
</tr>
<tr>
<td>Status</td>
<td>Update as work progresses. A requirement should reach Verified only when appropriate evidence exists. Statuses include: Not Started, In Progress, Implemented, Tested, Verified, Deferred, Blocked.</td>
</tr>
<tr>
<td>Evidence / Link</td>
<td>Link the dated execution result or inspection record, including its revision and limits, when claiming successful verification. A documented test case defines an intended procedure and expected outcome; it does not by itself establish that the case ran or passed.</td>
</tr>
<tr>
<td>Source basis</td>
<td>Requirements in the initial RTM were taken from Appendix A of the uploaded PEERS Service Level Agreement.</td>
</tr>
</table>
