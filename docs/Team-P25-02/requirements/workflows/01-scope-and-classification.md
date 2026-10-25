<a id="01-purpose-and-scope"></a>

<a id="section-1"></a>

# 1. Purpose and Scope

This document identifies the PEERS workflows that form the functional-preservation baseline for the current modernization project. It establishes criteria for determining which inherited professor and student workflows are critical, identifies supporting workflows that enable those outcomes, and separates those application workflows from the new engineering workflows introduced by the CI/CD modernization effort.

The project is intended to preserve and validate the existing PEERS application rather than replace it or substantially expand its business functionality. Accordingly, the workflows documented here represent the behavior that must remain usable as testing, containerization, configuration, CI/CD, and staging-deployment changes are introduced.

This document identifies what must be preserved and what modernization workflows must be established. Detailed test design, test-case selection, tooling, and execution strategy are intentionally deferred to the separate Automated Testing Strategy. Requirements-to-test traceability will be maintained separately in the Requirements Traceability Matrix (RTM).

<a id="02-workflow-classification-framework"></a>

<a id="section-2"></a>

# 2. Workflow Classification Framework

<a id="section-3"></a>

## 2.1 Critical Workflow Definition

A workflow is critical to PEERS if its failure prevents a primary professor or student task, compromises the integrity or confidentiality of essential data or access controls, or blocks another required workflow. Every critical workflow must have observable outcomes that support verification of functional preservation through regression or end-to-end testing.

A workflow qualifies as critical when any one of the following conditions applies:

Primary-task impact: failure prevents a professor or student from completing an essential PEERS task.

Data or access impact: failure can cause loss or corruption of essential data, incorrect results, unauthorized access, or disclosure of confidential evaluation information.

Dependency impact: failure blocks another required workflow from completing correctly.

<a id="section-4"></a>

## 2.2 Supporting Workflow Definition

A supporting workflow enables, prepares, or completes part of a critical workflow but is not necessarily a primary user goal by itself. Supporting does not mean optional: if a supporting workflow is required for a critical workflow to function correctly, its behavior must still be preserved within that dependency chain.

<a id="section-5"></a>

## 2.3 Classification Status

The classifications in this document are proposed for sponsor review. They are based on the approved PEERS functional baseline, project specification, the Technical Assessment, and the Application Architecture Review. If sponsor confirmation changes the supported functional baseline, the workflow classifications should be updated accordingly.

<br>

<a id="03-peers-functional-workflow-overview"></a>

<a id="section-6"></a>

# 3. PEERS Functional Workflow Overview

The inherited PEERS application supports a connected sequence of professor and student activities. At a high level, a professor authenticates, prepares a course and roster, organizes students into teams, creates and distributes an evaluation activity, and later reviews the resulting evaluation data. Students receive individualized access and submit peer evaluations. The table below identifies the proposed critical workflow baseline for preservation.

| ID | Critical Workflow | Primary Actor | Baseline Requirement |
| --- | --- | --- | --- |
| CW-01 | Professor Authentication and Authorized Access | Professor | FR-01 |
| CW-02 | Course Creation and Management | Professor | FR-02 |
| CW-03 | Student Roster Upload and Processing | Professor | FR-03 |
| CW-04 | Student Team Organization | Professor | FR-04 |
| CW-05 | Peer-Evaluation Activity Setup and Launch | Professor | FR-05 |
| CW-06 | Individualized Evaluation Link / Token Access | Student / System | FR-06 |
| CW-07 | Evaluation Invitation Distribution | Professor / System | FR-07 |
| CW-08 | Student Peer-Evaluation Submission | Student | FR-08 |
| CW-09 | Evaluation Results Review and Export | Professor | FR-10 |
