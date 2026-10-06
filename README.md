# IT415 Touchscreen POS Kiosk

Documentation for the IT415 practical examination. This folder currently contains the three reference PDFs and project planning documents. **No application implementation or Git repository is present yet.** A working kiosk, actual collaboration history, and a completed evaluation record still need to be produced.

## Start here

| File | Purpose |
| --- | --- |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Required kiosk behavior, transaction rules, source page references, and optional features. |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Suggested data model, screen flow, build order, and design decisions. |
| [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md) | The 15 instructor tests and the 26 application checklist checks. |
| [DEVELOPMENT_PROCESS.md](DEVELOPMENT_PROCESS.md) | Git/GitHub workflow, group evidence register, and process verification. |
| [AI_USAGE_LOG.md](AI_USAGE_LOG.md) | Template for recording actual AI prompts, responses, evaluation, and changes. |

The authoritative local references are `IT415_Practical_Exam.pdf`, `IT415-Acceptance-Checklist.docx.pdf`, and `IT415-Sample-UI.pdf`. These PDFs are intentionally excluded from the GitHub upload. The sample UI illustrates one acceptable design; the exam permits other layouts and technology choices as long as the required flow and behavior work.

The checklist refers to a **separately issued scoring rubric**. It was not among the supplied files, so exact point allocations are not documented here.

## Required customer flow

Select products -> review order -> select Cash, QR Payment, or Credit/Debit Card -> complete payment -> see confirmation and a unique transaction reference -> view digital receipt -> start a new transaction.

## Project details to complete when implementation begins

| Item | Actual project choice or evidence |
| --- | --- |
| Group name / section | Pending |
| Shared GitHub repository URL | Pending |
| Main or integration branch | Pending |
| Language, framework, and UI library | Pending |
| Product-data and transaction-storage approach | Pending; a database is not required by the exam |
| Application directory and entry point | Pending |
| Prerequisites and installation command | Pending |
| Exact local run command and URL/window | Pending |
| Build/test commands | Pending |
| Group roles and contributions | Record actual evidence in [DEVELOPMENT_PROCESS.md](DEVELOPMENT_PROCESS.md) |

Replace the pending entries with commands and choices that have been verified on a fresh local clone before submission. Do not present documentation templates as completed implementation or evidence.

## Minimum completion path

1. Choose the technology and storage approach; document why they fit a touchscreen kiosk.
2. Implement the required flow in [REQUIREMENTS.md](REQUIREMENTS.md).
3. Run every test in [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md), including Cash, QR, Card, reset, and reference uniqueness.
4. Record real member work, commits, branches, pull requests, reviews, and AI use in the evidence files.
5. Update this README with actual setup/run instructions and final technology, storage, and contribution details.

