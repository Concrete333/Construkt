# V1 MVP

## Purpose

V1 is the intelligent product layer.

After V0 proves the core construction payment and escrow concept, V1 adds features that make the platform feel modern, proactive, and differentiated. The focus is on AI assistance, chat-style workflows, and crypto payment management that makes blockchain operations feel safe and understandable.

## Product Thesis

V1 turns Construkt from a smart-contract payment workflow into an intelligent project finance assistant.

The platform should help users understand what needs attention, prepare the right action, and manage crypto-backed payment flows without needing deep blockchain knowledge.

## Target Audience

V1 is for:

- early pilot customers
- innovation teams
- finance teams evaluating crypto payment rails
- project teams who want guided workflows
- contractors who need simpler payment visibility

## Core Additions

### AI Assistant

Add a digital assistant that can answer questions such as:

- "Which invoices need my approval?"
- "Why is this package blocked?"
- "What documents are missing?"
- "What changed since last week?"
- "Which packages are at risk of exceeding budget?"
- "Summarize this work package."
- "Draft a rejection note for this invoice."
- "Explain this variation request."

The assistant should operate from project, package, invoice, document, and audit context.

### Project Chat

Add contextual chat surfaces:

- project-level chat
- work-package chat
- invoice/request thread
- variation thread
- document request thread

Chat should be tied to the relevant record so decisions are not lost in generic messaging.

### AI Summaries

Useful summaries:

- project health summary
- package status summary
- invoice approval summary
- variation impact summary
- document evidence summary
- weekly activity summary
- stakeholder-specific briefings

### AI Action Drafting

The assistant can draft but not automatically execute high-risk actions:

- invoice rejection note
- document request
- variation response
- finance release explanation
- contractor payment status message
- board/update summary

Human approval remains required.

### Crypto Payment Manager

Add a crypto payment management layer that hides operational complexity:

- wallet connection status
- wallet role match
- escrow funding status
- token balance visibility
- pending transaction state
- transaction confirmation messages
- failed transaction explanation
- explorer links
- payment release checklist

The product should explain crypto payment states in construction-friendly language.

### On-Chain Action Explainers

For each smart contract action, show:

- what will happen
- who is signing
- what account or escrow is affected
- what cannot be undone
- what happens next

Example:

"Finance is about to release 92,400 mock USDC from the package escrow to the contractor wallet after PM approval."

## Roles

V1 can keep the V0 roles:

- Finance
- Project Manager
- Contractor

But the assistant should tailor responses to role:

- Finance sees exposure, release readiness, escrow state, and payment risk.
- Project Manager sees approvals, document evidence, package progress, and contractor actions.
- Contractor sees assigned work, invoice status, missing evidence, and expected payment path.

## Backend And Data Requirements

V1 needs more than local UI state:

- account fetch/read layer
- off-chain metadata adapter
- stable record IDs
- audit/event index
- document reference storage
- chat/message storage
- AI context builder
- safe action permission checks

AI should never be the source of truth for payments or approvals. It reads context, explains it, and drafts actions.

## AI Safety Rules

The assistant must not:

- approve payments automatically
- release funds automatically
- submit transactions without user confirmation
- invent missing document evidence
- hide failed transaction states
- override on-chain authorization

The assistant may:

- summarize
- draft
- explain
- recommend
- flag risks
- prepare action forms

## Demo Narrative

The V1 demo should show:

1. Finance asks the assistant what needs attention.
2. Assistant identifies a package with a pending invoice and missing evidence.
3. PM requests the missing document from contractor.
4. Contractor uploads document and asks when payment will be released.
5. PM approves invoice with an AI-drafted note.
6. Finance uses the crypto payment manager to release escrow.
7. Assistant summarizes what happened and provides an explorer/audit reference.

## Out Of Scope For V1

V1 does not need to solve every real construction workflow.

Still out of scope:

- full NEC/JCT administration
- formal payment notice generation
- production-grade enterprise document control
- defect/snags system
- full programme management
- full ERP integration

Those belong in V2.

## Success Criteria

V1 succeeds if users feel:

- they understand what needs attention
- crypto payment actions are explainable
- the assistant reduces admin burden
- the system can produce useful summaries and drafts
- smart contract actions feel guided and safe

V1 is successful when Construkt feels not just trustworthy, but helpful.

