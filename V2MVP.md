# V2 MVP

## Purpose

V2 is the real-world construction operations release.

V2 focuses on the functionality construction managers, commercial teams, contract administrators, finance teams, and contractors would need before using the platform on live projects.

## Product Thesis

V2 turns Construkt into a serious construction payment, contract, document, and commercial control platform.

The product must support real project governance, not just payment release demos.

## Target Audience

V2 is for:

- construction directors
- estates directors
- project directors
- finance directors
- project managers
- quantity surveyors
- commercial managers
- contract administrators
- contractors and subcontractors
- auditors and legal reviewers

## Expanded Roles

V2 should consider adding:

- Construction Director
- Commercial Manager / Quantity Surveyor
- Contract Administrator
- Site Manager
- Client Observer
- Auditor / Legal Read-Only

The V0/V1 roles remain, but real construction use needs finer control over who can approve, inspect, certify, comment, and release.

## Commercial Control

Required capabilities:

- original budget
- approved budget
- committed cost
- forecast final account
- actual paid
- pending payments
- pending variations
- approved variations
- rejected variations
- contingency allocation
- contingency drawdown
- remaining contingency
- cashflow forecast by month
- package-level cost reports
- project-level commercial summary

The system should help answer:

- Are we over budget?
- What is committed but not paid?
- What is forecast but not approved?
- What exposure is sitting in variations?
- What is the expected final account?

## Programme And Delay

Required capabilities:

- baseline programme dates
- current forecast dates
- milestone slippage
- extension of time claims
- delay event register
- critical completion dates
- late approval impact
- late payment impact
- package completion status

The system should distinguish:

- cost change
- time change
- quality issue
- document/evidence issue
- payment administration issue

## Contract Administration

V2 should support contract-specific workflows, especially for NEC/JCT-style construction use:

- early warnings
- compensation events
- instructions
- payment notices
- pay less notices
- interim valuations
- practical completion
- sectional completion
- defects liability period
- retention release
- final account

Not every contract workflow needs to be fully automated at first, but the product must have a place to record, track, and evidence them.

## Document Control

Required capabilities:

- required document checklist per project/package/contract type
- document status: requested, submitted, accepted, rejected, expired, superseded
- document version control
- document expiry tracking
- contractor compliance documents
- insurance certificates
- RAMS
- warranties
- completion certificates
- materials vesting certificates
- site photos
- progress reports
- payment notices
- valuation evidence
- variation evidence
- handover pack readiness

Documents should be searchable, filterable, and linked to the relevant package, invoice, variation, notice, or approval.

## Quality And Site Assurance

Required capabilities:

- inspection requests
- inspection sign-off
- snag list
- defects register
- non-conformance reports
- site photos
- progress confirmation
- practical completion evidence
- quality hold before payment release

The platform should make it clear when payment is blocked because work, evidence, or quality sign-off is incomplete.

## Risk And Dispute Management

Required capabilities:

- risk register
- dispute register
- hold register
- partial hold vs full hold
- rejection reasons
- escalation workflow
- adjudication/export pack
- decision history
- comment threads tied to records

Disputes should be connected to the package, invoice, variation, documents, and audit trail.

## Notifications And Deadlines

Required capabilities:

- approval reminders
- document request reminders
- invoice deadline countdowns
- payment due date visibility
- escalation for overdue approvals
- contractor reminders
- finance release reminders
- programme milestone warnings

For construction use, deadlines are not decoration. They have commercial and legal consequences.

## Procurement And Contractor Readiness

Required capabilities:

- contractor onboarding
- wallet readiness
- insurance and compliance checks
- contract signed status
- package pre-start checklist
- contractor invitation flow
- subcontractor assignment history
- supplier/contact records

A package should not move cleanly into active/in-progress state until basic readiness is represented.

## Reporting

Required reports:

- project status report
- director portfolio dashboard
- commercial exposure report
- payment status report
- variation register
- document compliance report
- audit export
- handover readiness report
- contractor payment report

Reports should support export for board packs, project meetings, audits, and disputes.

## Integrations

Potential integrations:

- accounting systems
- ERP
- document storage
- project management systems
- email/calendar notifications
- wallet infrastructure
- identity/KYC/KYB providers
- chain explorer links
- IPFS/S3/Supabase-style metadata storage

## Construction Director View

A Construction Director should not need to inspect every package manually.

They need an exception dashboard showing:

- red/amber/green project status
- late approvals
- high-value pending releases
- disputed packages
- unresolved variations
- forecast overspend
- packages at risk of delay
- missing critical documents
- contractor issues
- finance exposure

The director view should answer:

- What needs my attention?
- What could delay completion?
- What could create cost exposure?
- What is blocked?
- What decision do I need to make?

## Out Of Scope For V2 MVP

Even V2 MVP does not need to become a full Procore/Aconex/ERP replacement.

Avoid trying to own:

- full drawing management
- full scheduling/Gantt replacement
- full procurement marketplace
- full accounting ledger
- full HR or safety management

The focus should remain on trusted package payments, approvals, evidence, contract events, and auditability.

## Success Criteria

V2 succeeds if real construction stakeholders can see how Construkt fits into live project governance.

They should believe:

- the payment workflow maps to real contracts
- evidence is controlled
- approvals are auditable
- delays and variations are visible
- finance exposure is understandable
- disputes can be evidenced
- the system can support real projects, not only demos

V2 is successful when construction teams can imagine piloting the platform on a controlled real-world project.

