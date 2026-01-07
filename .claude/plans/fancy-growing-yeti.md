# Landing Page + App Routing Plan

## Goal
- Landing page at `/` (marketing)
- React app at `/app/*` (authenticated experience)
- Clean URLs with Cloudflare Pages

---

## Current State
- `landing.html` - Standalone HTML landing page
- `index.html` → `index.tsx` → React app at `/`
- Routes: `/`, `/contacts`, `/tasks`, `/settings`, `/analytics`
- Deployment: Cloudflare Pages with Wrangler

---

## Implementation Approach

### Option A: React Router Integration (Recommended)
Convert landing to React component, handle all routing in React.

**Pros:** Single build, shared components, easier maintenance
**Cons:** Landing page loads React bundle (slightly heavier)

### Option B: Multi-Page App
Keep landing.html separate, configure Cloudflare routing.

**Pros:** Lighter landing page
**Cons:** Two separate codebases, more complex deployment

---

## Detailed Plan (Option A)

### Step 1: Create Landing Page Component
**File:** `/components/LandingPage.tsx`
- Convert `landing.html` to React component
- Keep all styles inline or in component
- Preserve animations (neural canvas, scroll reveal)

### Step 2: Update Root Routing
**File:** `/index.tsx`
- Add route structure:
  ```
  /           → LandingPage
  /app/*      → App (authenticated routes)
  ```

### Step 3: Update App Routes
**File:** `/App.tsx`
- Change base path from `/` to `/app`
- Routes become:
  ```
  /app            → Dashboard/Chat
  /app/contacts   → Contacts
  /app/contacts/:id → Contact Detail
  /app/tasks      → Tasks
  /app/settings   → Settings
  /app/analytics  → Analytics
  ```

### Step 4: Update Navigation Links
**Files:** Multiple components
- Sidebar.tsx - nav items
- LandingPage.tsx - "Get Started" buttons
- Any hardcoded links

### Step 5: Cloudflare Pages Config
**File:** `/public/_redirects`
```
/*    /index.html   200
```
This ensures SPA routing works (all paths serve index.html, React handles routing).

### Step 6: Auth Flow Update
- Unauthenticated users at `/app/*` → redirect to `/` or show login
- After login → redirect to `/app`
- "Get Started" on landing → `/app` (shows login if not authenticated)

---

## Files to Modify

| File | Change |
|------|--------|
| `/components/LandingPage.tsx` | **NEW** - Landing page React component |
| `/index.tsx` | Add root-level routing (/ vs /app) |
| `/App.tsx` | Prefix all routes with /app |
| `/components/Sidebar.tsx` | Update nav paths |
| `/public/_redirects` | **NEW** - Cloudflare SPA routing |
| `/landing.html` | **DELETE** after migration |

---

## Auth Redirect Logic

```tsx
// In index.tsx or App.tsx
if (pathname === '/' && isAuthenticated) {
  // Option: auto-redirect to app
  // Or: show landing with "Go to App" button
}

if (pathname.startsWith('/app') && !isAuthenticated) {
  // Show login modal or redirect to /
}
```

---

## Testing Checklist
- [ ] Landing page renders at /
- [ ] All animations work (neural canvas, scroll reveal)
- [ ] "Get Started" navigates to /app
- [ ] Auth flow works (login → /app)
- [ ] All /app/* routes work
- [ ] Direct URL access works (e.g., /app/contacts)
- [ ] Cloudflare deployment serves SPA correctly
