<!--
Sync Impact Report:
- Version change: 1.0.0 -> 2.0.0
- List of modified principles:
    - Removed: I. Library-First, II. CLI Interface, III. Test-Driven Development (TDD)
    - Added: I. Güvenlik, II. Performans, III. Basitlik, IV. Erişilebilirlik, V. İzlenebilirlik, VI. Ürün Odağı, VII. Marka
- Templates requiring updates:
    - ✅ .specify/templates/plan-template.md
- Follow-up TODOs: None
-->
# Kapgel Constitution
*"Gönder Gelsin"*

## Core Principles

### I. Güvenlik (Security)
Supabase Row Level Security (RLS) is mandatory for all database queries. Access control must be role-based.

### II. Performans (Performance)
The application must be a Progressive Web App (PWA) with a focus on fast First Contentful Paint (FCP) and Time to Interactive (TTI). The shopping cart must be available offline.

### III. Basitlik (Simplicity)
Strive for minimum dependencies and a readable, maintainable architecture. Avoid over-engineering.

### IV. Erişilebilirlik (Accessibility)
Ensure WCAG AA compliance, including proper color contrast, visible focus indicators for all interactive elements, and full keyboard accessibility.

### V. İzlenebilirlik (Observability)
Implement structured event logging and basic telemetry for all user-facing features to monitor health and usage.

### VI. Ürün Odağı (Product Focus)
The primary target market is businesses that have their own delivery couriers and/or offer a take-away (pickup) model.

### VII. Marka (Brand)
The brand is Kapgel. The tone and visuals should align with the slogan "Gönder Gelsin".

## Development Workflow

All code changes must be submitted as pull requests and require at least one approval from a team member.

## Versioning & Breaking Changes

The project follows Semantic Versioning (MAJOR.MINOR.PATCH). Any breaking change must be announced in advance and requires a major version bump.

## Governance

All PRs/reviews must verify compliance with this constitution.

**Version**: 2.0.0 | **Ratified**: 2025-09-29 | **Last Amended**: 2025-09-29