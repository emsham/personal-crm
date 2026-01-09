# Security TODO

Remaining security recommendations from the security audit.

## High Priority

- [ ] **Enforce App Check in Firebase Console**
  - Go to Firebase Console → App Check
  - For Firestore: Click three dots → Enforce
  - For Auth: Click three dots → Enforce
  - This blocks requests without valid App Check tokens

- [ ] **Configure API Key Restrictions in Google Cloud Console**
  - Go to Google Cloud Console → APIs & Services → Credentials
  - Click on your Firebase API key
  - Add HTTP referrer restrictions (for web)
  - Add app bundle ID restrictions (for mobile)
  - Set quota limits

## Medium Priority

- [ ] **Set up App Check for Mobile (Production)**
  - iOS: Configure DeviceCheck or App Attest in Firebase Console
  - Android: Configure Play Integrity in Firebase Console
  - Register production app builds

- [ ] **Enable Firestore Backups**
  - Firebase Console → Firestore → Backups
  - Configure automated backups for disaster recovery

- [ ] **Review Firebase Auth Settings**
  - Verify account lockout is enabled after failed attempts
  - Check IP-based rate limiting configuration

## Low Priority

- [ ] **Add Audit Logging**
  - Consider Cloud Functions to log security events (login attempts, API key changes)

- [ ] **Content Security Policy**
  - If using Firebase Hosting, add CSP headers in firebase.json
