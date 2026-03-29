# 🌌 Aetherion: UI/UX Design Specification

## Overview
This document serves as the comprehensive UI/UX blueprint for our integrated platform. The application provides three core features: **Vehicle Booking**, **Vehicle Renting Suggestion**, and **AI Tour Scoring**. 

> [!TIP]
> **Aesthetic Direction:** We are utilizing a premium, modern "Glassmorphism" design system on a dark mode canvas. Expect deep space blacks (`#0B0F19`), vibrant neon accents (electric blue `#00F0FF`, and radiant purple `#B026FF`), and smooth micro-animations.

---

## 1. Route: Vehicle Booking Application

**Path:** `/booking`
**Goal:** Allow users to browse, filter, and secure vehicles seamlessly.

![Vehicle Booking Mockup](file:///C:/Users/Admin/.gemini/antigravity/brain/32e4a1b5-e4be-4025-8447-aa389932083e/vehicle_booking_ui_1774751589351.png)

### Structural Layout
- **Left Sidebar (Filters):** Fixed panel with slider components for Price Range, Checkboxes for Vehicle Type (SUV, Sedan, Hypercar), and Date Pickers.
- **Main Content Area (Grid):** A responsive CSS Grid displaying Vehicle Cards. 
- **Vehicle Card Components:**
  - High-quality vehicle image floating over a frosted glass backdrop.
  - Badges for state (`Available`, `Booked`).
  - Neon "Book Now" CTA button that triggers a luminous hover effect.
- **Checkout Modal:** A slide-out panel preventing page reload, ensuring a snappy transaction flow.

---

## 2. Route: Smart Renting Suggestion

**Path:** `/renting/suggestions`
**Goal:** Act as an AI concierge that recommends the perfect vehicle based on the user's intended destination and party size.

![Vehicle Renting Suggestion Mockup](file:///C:/Users/Admin/.gemini/antigravity/brain/32e4a1b5-e4be-4025-8447-aa389932083e/vehicle_renting_ui_1774751610869.png)

### Structural Layout
- **Hero Section:** A natural language input field (e.g., *"I am taking 4 people to the snowy mountains of Aspen next week"*).
- **Processing State:** A subtle glowing skeletal loader to simulate "AI thinking" (anti-hallucination UX: "Analyzing terrain...", "Checking weather factors...").
- **Results Dashboard:**
  - **Top Match Card:** Emphasized centrally, showing the #1 recommended vehicle and exactly *why* it was chosen (e.g., "AWD capabilities match your Aspen destination").
  - **Alternative Options Grid:** 2-3 alternative vehicles with transparent, slightly dimmed glass cards.

---

## 3. Route: AI Tour Scoring System

**Path:** `/tour-judging`
**Goal:** A purely data-driven, transparent view calculating external factors for a specific tour destination.

![Tour Scoring Dashboard Mockup](file:///C:/Users/Admin/.gemini/antigravity/brain/32e4a1b5-e4be-4025-8447-aa389932083e/tour_scoring_ui_1774751626224.png)

### Structural Layout
- **Destination Input Header:** Clean input field to lock in the Location and Timeframe.
- **Main KPI Dashboard:** 
  - **The Final Score Ring:** A massive, glowing SVG circular progress chart in the center (`e.g., 87/100`). Color shifts based on score (Red/Yellow/Green).
- **External Factors Grid (The "Why"):**
  - **Weather Card:** Live API data snippet, showing precipitation probability.
  - **Traffic Card:** Current congestion index.
  - **Safety Card:** Real-time localized safety score.

> [!IMPORTANT]
> **Anti-Hallucination Design:** Each factor card *must* feature a small "i" (info) icon explaining the data lineage (e.g., "Data sourced from National Weather Service at 14:00").

---

## Global Design System

### Typography
- **Headers:** `Outfit` (Geometric, futuristic, commanding)
- **Body:** `Inter` (Highly legible, clean, modern)

### Color Palette
- **Background:** Deep Space `#0B0F19`
- **Surface (Glass):** `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(12px)`
- **Primary Accent:** Cyber Blue `#00F0FF`
- **Secondary Accent:** Plasma Purple `#B026FF`
- **Text Primary:** `#F3F4F6` (Cool White)
- **Text Secondary:** `#9CA3AF` (Muted Gray)

### Component Architecture (React/Next.js)
```jsx
/components
  /ui
    - GlassCard.tsx       // Base frosted wrapper
    - NeonButton.tsx      // Primary CTA
    - DataRing.tsx        // The score visualizer
  /booking
    - VehicleGrid.tsx
    - FilterPanel.tsx
  /scoring
    - FactorCard.tsx      // Individual weather/traffic stats
```
