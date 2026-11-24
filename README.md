# Zivo ShopHelper — Multi-shop cloud POS

This project uses Firebase Authentication + Cloud Firestore. Each shop has its own `/shops/{shopId}` workspace; user membership records determine access. Business data is not stored in localStorage. Terms acceptance is session-only; UI theme preferences are currently in-memory.

## Included
- Existing Zivo ShopHelper POS interface and modules
- Email/password Firebase Authentication (minimum 8-character password)
- Unique shop workspace per owner and shop-scoped data document
- Server-enforced membership and role checks in `firestore.rules`
- Callable Cloud Functions for staff invitation, permission updates, and disabling
- PWA manifest and service worker shell cache

## Setup
1. In Firebase Console for `zivo-shophelper`, enable **Authentication → Email/Password**.
2. Create/enable Cloud Firestore in production mode.
3. Install Firebase CLI: `npm i -g firebase-tools`; run `firebase login`.
4. Deploy rules/indexes/functions: `firebase deploy --only firestore:rules,firestore:indexes,functions`.
5. Host the project over HTTPS (Firebase Hosting recommended): `firebase deploy --only hosting`.
6. Add your hosting domain under Authentication → Settings → Authorized domains.

## Important notes
- Firebase web API keys are public project identifiers, not server secrets. Restrict the key by HTTP referrer in Google Cloud and enable Firebase App Check before public launch.
- Staff member must first register an account, then the owner can invite that email using `window.__zivoCloud.inviteStaff(email, permissions)`; disable/update with `window.__zivoCloud.updateStaff(uid, permissions, 'disabled')`.
- This first cloud conversion stores the existing POS collections in a single shop-scoped document for compatibility. For production scale, migrate bills, inventory, customers, returns and suppliers into individual subcollections with pagination and transactions.
- Offline queue/synchronization is not implemented yet. The service worker caches the app shell only; do not treat offline mode as available.
- Review the existing terms/privacy text before public release. Remove any statements that imply the creator can inspect private shop data unless that is actually intended and disclosed.
- Test with two separate owner accounts and a staff account before using real customer/business records.
