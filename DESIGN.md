---
name: DAWV Agri Portal
description: An executive dashboard for Western Visayas agriculture.
colors:
  forest: "#133a2b"
  leaf: "#15583b"
  paper: "#f5f3eb"
  panel: "#fffefa"
  harvest: "#ad782b"
  ink: "#20382c"
  muted: "#718374"
  line: "#d6ded3"
typography:
  display:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "clamp(34px, 4vw, 58px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  small: "4px"
  navigation: "7px"
spacing:
  small: "8px"
  medium: "16px"
  large: "32px"
components:
  active-navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.forest}"
    rounded: "{rounded.navigation}"
    padding: "13px 12px"
  data-surface:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.small}"
    padding: "20px 16px"
---

## Overview

The portal reads like a public agricultural data report. The deep green rail anchors the DA identity; warm paper, dark ink, and a restrained harvest accent keep statistical content readable. A plain-language finding leads each section, followed by controls, measures, trends, geographic rankings where available, and source detail.

## Colors

Use forest for navigation. Give each subject a recognizable accent: harvest amber for rice and corn, rose for fruit, leaf green for vegetables, earth brown for other crops, terracotta for livestock, ochre for poultry, and blue for RSBSA. Paper and thin line separators organize the page without floating cards. Pair color with a direction word or number.

## Typography

Literata gives findings an editorial voice. DM Sans supports controls, annotations, tables, and labels. Show full values in tooltips and tables.

## Layout

Desktop uses a 220px navigation rail, a green top bar, a pale harvest metric strip, and a compact two-column data workspace. Full-width sections hold the production trend, province comparison, and table. On narrow screens, the content becomes one column and navigation scrolls horizontally. Tables scroll within their own area. The RSBSA navigation opens the separate public Power BI report.

During the 37th National Statistics Month, a slim blue ribbon above the report carries the official theme, the provided PSA and Bagong Pilipinas logos, and a Statman cutout derived from the supplied artwork. Logos sit directly on the ribbon or green rail with a light silhouette outline; they have no rectangular backing.

## Elevation & Depth

Surface color and thin borders provide depth. Shadows are not part of the core system.

## Shapes

Charts, filters, and the lead use restrained square corners. The circular refresh control is a compact-action exception.

## Components

Filters have visible labels and 44px touch targets. Trend charts expose accessible labels and exact values on points. Rank bars pair place, value, unit, and relative length. Loading and source errors have explicit states.

## Do's and Don'ts

- Lead with a factual sentence before charts.
- Keep scope, units, and source close to numbers.
- Show source errors instead of invented estimates.
- Avoid dual axes, rotated place labels, and invented demographics.
