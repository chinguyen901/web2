# Design System Specification: The Kinetic Noir Directive

## 1. Overview & Creative North Star
**Creative North Star: "The Neon Brutalist"**

This design system is engineered to bridge the gap between high-fashion editorial and futuristic street culture. It rejects the "safe" constraints of standard e-commerce templates in favor of a high-energy, high-contrast environment that feels alive. We move beyond "Modern" into a "Kinetic" space where layouts feel like snapshots of motion. 

By utilizing a hard-edge geometry (0px border radius) paired with ethereal neon glows and tonal layering, we create an atmosphere of "Organic Brutalism." We achieve a premium feel not through decoration, but through the aggressive use of negative space, massive typography scales, and a rejection of traditional UI crutches like structural dividers.

---

## 2. Colors & Surface Logic

### The Palette
The core of the experience is built on an ultra-dark foundation (`surface: #131313`) punctuated by the sharp electricity of `primary_container: #bc13fe`.

- **Primary Accent (`#bc13fe`):** Use for high-intent actions and brand-defining moments.
- **Tonal Contrast:** Utilize `secondary_fixed: #e2e2e2` for high-readability body text against the dark void.

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. We define boundaries through **Tonal Shifts**. 
- To separate a header from a hero section, shift from `surface` to `surface_container_low`. 
- Content blocks are distinguished by their "depth" in the stack, not by lines that "trap" the content.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical plates. Use the following hierarchy to create depth:
1.  **Base Layer:** `surface` (#131313)
2.  **Sectional Content:** `surface_container_low` (#1b1b1b)
3.  **Interactive Cards:** `surface_container` (#1f1f1f)
4.  **Floating Elements/Popovers:** `surface_container_highest` (#353535)

### The "Glass & Glow" Rule
To achieve the futuristic "Gen Z" edge, use **Glassmorphism** for navigation bars and overlays. 
- Apply `surface_container` at 70% opacity with a `20px` backdrop blur.
- **Signature Texture:** Apply a `1px` inner glow (box-shadow: inset) using `primary` at 20% opacity to "floating" cards to mimic a light-refracting edge.

---

## 3. Typography: The Editorial Voice

We utilize a dual-font strategy to balance aggressive branding with functional shopping.

- **Display & Headlines (Space Grotesk):** This is our "loud" voice. Use `display-lg` (3.5rem) for hero statements. Tighten the letter-spacing (kerning) by -2% to -4% to create a dense, "blocky" aesthetic that feels structural.
- **Functional Text (Inter):** Used for `body` and `labels`. Inter provides the "Shopify-level" clarity required for high-conversion e-commerce.

**Typography as Layout:** Do not just "place" text. Treat `display-md` headers as structural elements that can overlap image containers or bleed off the edge of the grid to create an intentional, asymmetric "Zine" feel.

---

## 4. Elevation & Depth: Tonal Layering

### The Layering Principle
Forget shadows. Hierarchy is achieved by "stacking." A product card should be `surface_container_low`. When hovered, it transitions to `surface_container_high`. This subtle shift in luminosity signals interactivity more elegantly than a heavy drop shadow.

### Ambient Shadows
If a floating element (like a Cart Drawer) requires a shadow, it must be a "Neon Bloom":
- **Color:** `primary_container` (#bc13fe)
- **Opacity:** 8% - 12%
- **Blur:** 40px - 60px
This creates a subtle atmospheric glow rather than a muddy grey shadow.

### The "Ghost Border"
When a container requires a boundary (e.g., an input field), use the `outline_variant` token at **15% opacity**. It should feel like a whisper of a line, only visible enough to define the shape.

---

## 5. Components

### Buttons: The Kinetic Trigger
- **Primary:** Background `primary_container` (#bc13fe), Text `on_primary_container` (#ffffff). **Shape:** Strictly 0px (Sharp).
- **Secondary:** Background `transparent`, Border `1px solid outline_variant` (20% opacity).
- **Micro-interaction:** On hover, Primary buttons should trigger a "Bloom" effect (box-shadow with primary color) and a slight 2px upward shift.

### Cards: The Product Frame
- **Styling:** Forbid all dividers. 
- **Structure:** Use `surface_container_lowest` for the image background to create a "void" effect. The product metadata (Title/Price) sits on `surface` below.
- **Hover:** The border transitions from 0% opacity to 100% `primary_container` glow.

### Input Fields: The Minimalist Entry
- **State:** Underline-only or subtle "Ghost Border" containers.
- **Focus:** The bottom border transforms into a `2px` `primary_container` line with a soft glow. Text labels use `label-sm` and remain all-caps for an architectural feel.

### Navigation: The Glass Rail
- **Style:** Fixed position, `surface_container` with 60% opacity and heavy backdrop blur. No bottom border. Use a `surface_bright` top-border at 10% opacity for a "rim light" effect.

---

## 6. Do's and Don'ts

### Do
- **DO** use extreme scale. A price can be `headline-lg` if it's the most important thing on the page.
- **DO** embrace "The Void." Let `surface` black (#131313) occupy large areas of the screen to make the `primary` purple pop.
- **DO** use `0px` border radius everywhere. Sharp corners convey precision and edge.

### Don't
- **DON'T** use rounded corners. It softens the brand and moves it toward "Generic Tech."
- **DON'T** use grey shadows. If it needs depth, use color-tinted glows or tonal shifts.
- **DON'T** use 100% opaque white borders. They are too jarring and break the futuristic "dark-web" aesthetic.
- **DON'T** use standard "Select" or "Dropdown" styles. Build custom, high-contrast menus that utilize the `surface_container_highest` tokens.