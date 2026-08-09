# SecureMed Home Discovery & Design Plan

**Goal:** Transform the SecureMed landing page from a generic "modern healthcare management" template into a distinctive, identity-rich interface that reflects the gravity of medical triage and the clarity of patient-centered healthcare.

**Architecture:** We will adopt a "Clarity & Reliability" aesthetic: a design that prioritizes legible information hierarchy, high-contrast UI, and subtle, human-centric motion. The typography will shift from generic sans-serif to a clinical pairing (e.g., Inter/IBM Plex Mono). The signature will be a "vitality indicator" — a subtle, responsive visual element in the hero that ties real-time service state (like triage queue load) to the design itself, proving this isn't a static template.

**Tech Stack:** Tailwind CSS, Lucide React, Framer Motion (for refined interaction).

## Global Constraints
- **Identity:** No warm creams/terracotta/dark modes with single neon-green-or-vermilion-accents.
- **Typography:** Clinical, precise. Avoid generic rounded display fonts.
- **Layout:** Dense but clear; information-first, not illustration-heavy.
- **Signature:** Must be an interactive element that reacts to or displays state.

---

### Task 1: Define Design Language Token System

**Files:**
- Create: `securemed-frontend/app/globals.css` (tokens), `securemed-frontend/lib/design-tokens.ts`

**Interfaces:**
- Produces: Tailwind theme config overrides for clinical palette (Cool Grey #F1F3F4, Precision Blue #0055FF, Alert Crimson #D32F2F) and typographic hierarchy.

- [ ] **Step 1.1: Design palette**
      - Cool Grey: #F8F9FA, #E9ECEF, #DEE2E6
      - Precision Blue: #0055FF, #0044CC (Action)
      - Alert Crimson: #D32F2F, #B71C1C (Urgency)
      - Steel Contrast: #212529

- [ ] **Step 1.2: Design typography**
      - Display: IBM Plex Sans, bold, precise.
      - Body: Inter, medium weight.
      - Utility (data/stats): IBM Plex Mono, sharp.

- [ ] **Step 1.3: Commit**
      ```bash
      git add securemed-frontend/app/globals.css securemed-frontend/lib/design-tokens.ts
      git commit -m "design: establish clinical token system"
      ```

---

### Task 2: Implement Hero Reimagining (The Signature)

**Files:**
- Modify: `securemed-frontend/components/landing-page.tsx:126-250`

**Interfaces:**
- Consumes: Design Tokens from Task 1.
- Produces: The "Vitality Indicator" hero.

- [ ] **Step 2.1: Implement the "Vitality Indicator" component**
      (A canvas or multi-path SVG component that displays a soft, pulsating activity signal based on the triage queue).

- [ ] **Step 2.2: Redesign Hero Layout**
      - Replace existing 5xl/7xl header with a precise 3-column layout: Status Indicator, Value Proposition, Actionable triage link.

- [ ] **Step 2.3: Commit**
      ```bash
      git add securemed-frontend/components/landing-page.tsx
      git commit -m "feat(design): implement vitality-focused hero"
      ```

---

### Task 3: Refine UX Signposting

**Files:**
- Modify: `securemed-frontend/components/landing-page.tsx:141-198` (Services Bar)

**Interfaces:**
- Refines existing icon interaction.

- [ ] **Step 3.1: Replace generic service cards with high-density data-focused cards.**
      - Each card now labels the "current" status (e.g., "Available" vs "Wait: 15m") to drive utility.

- [ ] **Step 3.2: Commit**
      ```bash
      git add securemed-frontend/components/landing-page.tsx
      git commit -m "feat(design): refine service UX for real-time clarity"
      ```

---

## After the Design

After finishing the implementation, update the `README.md` to reference the design rationale and ensure the new identity is applied globally. 

**Plan complete and saved to `docs/superpowers/plans/2026-07-29-design-system-home.md`**.

Which execution option do you prefer? (Note: I am in an isolated environment without external network—the inline execution of the design changes is feasible, but will be limited by standard library constraints).
