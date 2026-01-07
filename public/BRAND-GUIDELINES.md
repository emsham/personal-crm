# Tethru Brand Guidelines

## Logo Files

| File | Use Case |
|------|----------|
| `tethru-icon-color.svg` | Primary icon, full color |
| `tethru-logo-dark-bg.svg` | Horizontal lockup for dark backgrounds |
| `tethru-logo-light-bg.svg` | Horizontal lockup for light backgrounds |
| `tethru-icon-white.svg` | Monochrome white for colored/photo backgrounds |
| `tethru-icon-dark.svg` | Monochrome dark for light backgrounds |
| `tethru-favicon-32.svg` | Favicon, 32px optimized |
| `tethru-favicon-16.svg` | Favicon, 16px optimized |
| `tethru-app-icon.svg` | App icon with gradient background (512x512) |
| `tethru-social-avatar.svg` | Social media profile picture |

---

## Brand Colors

### Primary Gradient
- **Start:** `#63b3ed` (AI Blue)
- **End:** `#a78bfa` (Neural Purple)
- **CSS:** `linear-gradient(135deg, #63b3ed, #a78bfa)`

### For Light Backgrounds (darker variant)
- **Start:** `#3b82f6`
- **End:** `#8b5cf6`

### Neutral Colors
- **Deep Space (dark bg):** `#0a0a0f`
- **Dark Text:** `#1a1a2e`
- **White:** `#ffffff`

---

## Typography

**Primary Font:** Sora  
**Weights:** 400 (Regular), 500 (Medium), 600 (Semibold)  
**Google Fonts:** `https://fonts.google.com/specimen/Sora`

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');
```

---

## Logo Anatomy

```
      [Blue Node]----[Center Core]----[Purple Node]
                          |
                          |
                          |
                      [Bottom Node]
```

- **Blue Node:** `#63b3ed` — Represents connection start
- **Purple Node:** `#a78bfa` — Represents connection end  
- **Center Core:** Gradient — The AI that manages relationships
- **T Shape:** The initial of Tethru, subtly formed by the structure

---

## Clear Space

Maintain clear space around the logo equal to the height of the center core node on all sides.

---

## Minimum Sizes

- **Icon only:** 16px minimum
- **With wordmark:** 100px width minimum

---

## Don'ts

- Don't rotate the logo
- Don't stretch or distort
- Don't change the gradient colors
- Don't add effects (shadows, outlines)
- Don't place on busy backgrounds without sufficient contrast

---

## Usage Examples

### Dark Background
Use `tethru-logo-dark-bg.svg` or `tethru-icon-color.svg` with white text

### Light Background  
Use `tethru-logo-light-bg.svg` or `tethru-icon-color.svg` with dark text

### Gradient or Photo Background
Use `tethru-icon-white.svg` (monochrome white version)

### Favicon
Use `tethru-favicon-32.svg` for standard favicon, `tethru-favicon-16.svg` for smallest sizes

### App Icon
Use `tethru-app-icon.svg` — the gradient background version works best for mobile/desktop apps

---

*Generated for tethru.com*
