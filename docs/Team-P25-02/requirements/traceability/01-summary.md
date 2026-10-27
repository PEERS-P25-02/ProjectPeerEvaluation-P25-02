# Summary

<table>
<tr>
<td>RTM Statistics</td>
<td>Count</td>
</tr>
<tr>
<td>Requirement Types</td>
<td></td>
</tr>
<tr>
<td>Functional Requirements</td>
<td><span title="=COUNTIF(RTM[Type],&quot;Functional&quot;)">25</span></td>
</tr>
<tr>
<td>Nonfunctional Requirements</td>
<td><span title="=COUNTIF(RTM[Type],&quot;Nonfunctional&quot;)">11</span></td>
</tr>
<tr>
<td>Total Requirements</td>
<td><span title="=SUM(B11:B12)">36</span></td>
</tr>
<tr>
<td></td>
<td></td>
</tr>
<tr>
<td>Requirement Status</td>
<td></td>
</tr>
<tr>
<td>Not Started</td>
<td><span title="=COUNTIF(RTM[Status],&quot;Not Started&quot;)">24</span></td>
</tr>
<tr>
<td>In Progress</td>
<td><span title="=COUNTIF(RTM[Status],&quot;In Progress&quot;)">12</span></td>
</tr>
<tr>
<td>Implemented</td>
<td><span title="=COUNTIF(RTM[Status],&quot;Implemented&quot;)">0</span></td>
</tr>
<tr>
<td>Tested</td>
<td><span title="=COUNTIF(RTM[Status],&quot;Tested&quot;)">0</span></td>
</tr>
<tr>
<td>Verified</td>
<td><span title="=COUNTIF(RTM[Status],&quot;Verified&quot;)">0</span></td>
</tr>
<tr>
<td>Deferred</td>
<td><span title="=COUNTIF(RTM[Status],&quot;Deferred&quot;)">0</span></td>
</tr>
<tr>
<td>Blocked</td>
<td><span title="=COUNTIF(RTM[Status],&quot;Blocked&quot;)">0</span></td>
</tr>
<tr>
<td>Completion</td>
<td></td>
</tr>
<tr>
<td>Completion Percentage</td>
<td><span title="=IFERROR(COUNTIF(RTM[Status],&quot;Verified&quot;)/COUNTA(RTM[Requirement ID]),0)">0</span></td>
</tr>
</table>

The status counts reflect the maintained statuses in the current RTM; they are not an exhaustive fresh audit of every project requirement. FR-01 through FR-10 and FR-16 remain In Progress because relevant integration evidence exists while documented workflow, security, browser, or requirement-alignment gaps remain. FR-15 is In Progress because local integration testing is implemented but the hosted CI workflow has no integration-test job. No requirement is marked Verified by this update.
