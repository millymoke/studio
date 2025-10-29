git push origin main
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment

Create a `.env.local` using the keys below (see `.env.example`):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
BACKEND_URL=
```

## Deploy to Vercel

For a simpler deployment and billing experience, you can deploy this project directly to Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffirebase%2Fstudio-prototyping-apps%2Ftree%2Fmain%2Fmedia-hub-genkit&project-name=media-hub-genkit&repository-name=media-hub-genkit&demo-title=Media%20Hub%20with%20Genkit&demo-description=A%20Next.js%20app%20with%20AI-powered%20features%20using%20Genkit.&demo-url=https%3A%2F%2Fmedia-hub-genkit.vercel.app%2F&demo-image=https%3A%2F%2Ffirebasestudio.forged.app%2Fmedia-hub-genkit-og.png&integration-ids=oac_V3R1GIp59f5A3A22jB2E6kR5)

### How it Works:

1.  **Click the Button**: Click the "Deploy with Vercel" button above.
2.  **Connect Your GitHub**: Vercel will prompt you to connect your GitHub account and clone this project's code into a new repository that you own.
3.  **Set Environment Variables**: During setup, Vercel will ask for your `GEMINI_API_KEY`. You will need to provide this for the AI features to work.
4.  **Deploy**: Vercel will handle the rest. It will build your application and deploy it to a live URL.

From there, you can easily set up manual billing with a credit card directly in your Vercel account settings. This process avoids all the complexities of Google Cloud's billing and IAM roles.

## Hostinger (VPS) Deploy

1. Build locally or in CI:
   - `npm ci`
   - `npm run build`
2. Copy `.next`, `public`, `package.json`, `package-lock.json`, and `.env.production` to the server.
3. Install and start:
   - `npm ci --only=production`
   - `npm run start` (behind Nginx/PM2)
4. Set environment variables in your process manager or systemd service.