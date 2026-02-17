# LinkedInSnap 📸

A Progressive Web App (PWA) that makes it easy to share your LinkedIn profile and take selfies with new connections!

## How It Works

1. Navigate to `ekohilas.github.io/linkedinsnap#YOUR_LINKEDIN_USERNAME`
2. A QR code appears showing your LinkedIn profile
3. Tap the QR code to open the camera (selfie mode)
4. Tap the screen to capture a photo
5. Use the share sheet to save the photo to your camera roll
6. The app returns to the QR code screen

## Features

✅ No backend required  
✅ Hostable via GitHub Pages  
✅ Progressive Web App - installable on mobile devices  
✅ Saves photos to camera roll via Web Share API  
✅ Built with SolidJS and TypeScript  
✅ Front-facing camera (selfie mode) by default  
✅ Responsive design for mobile and desktop  

## Tech Stack

- **Framework**: SolidJS
- **Language**: TypeScript
- **Build Tool**: Vite
- **QR Code**: qrcode library
- **PWA**: vite-plugin-pwa
- **Camera**: getUserMedia API
- **Photo Save**: Web Share API (with download fallback)

## Development

### Prerequisites

- Node.js 18+ and npm

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173/linkedinsnap/#yourusername` to test locally.

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment to GitHub Pages

This project is configured to automatically deploy to GitHub Pages via GitHub Actions.

### Setup Steps

1. Push your code to GitHub
2. Go to your repository Settings → Pages
3. Under "Build and deployment":
   - Source: **GitHub Actions**
4. Push to the `main` branch to trigger a deployment

The workflow in `.github/workflows/deploy.yml` will automatically:
- Install dependencies
- Build the project
- Deploy to GitHub Pages

Your app will be available at: `https://YOUR_USERNAME.github.io/linkedinsnap/`

## Usage Example

Share this link with people you meet:

```
https://ekohilas.github.io/linkedinsnap#ekohilas
```

When they scan or visit the link:
- They see your LinkedIn QR code
- They can tap it to take a selfie with you
- The photo saves to their camera roll

## Browser Compatibility

- ✅ **iOS Safari**: Full support (PWA, Camera, Web Share API)
- ✅ **Android Chrome**: Full support
- ⚠️ **Desktop**: QR code works, camera works, but uses download fallback for saving photos
- ⚠️ **Firefox Mobile**: May have limited Web Share API support

## Camera Permissions

The app requires camera access. On first use:
- **iOS**: You'll be prompted to allow camera access
- **Android**: You'll be prompted to allow camera access
- **Desktop**: Browser will ask for camera permission

Note: iOS Safari may ask for camera permission each session for web apps.

## Photo Saving

The app uses the **Web Share API** which:
- Opens the native share sheet on mobile devices
- Allows users to select "Save Image" or "Add to Photos"
- Requires one additional tap, but works reliably across iOS and Android

On desktop browsers without Web Share API support, photos are automatically downloaded to your Downloads folder.

## PWA Installation

To install as an app on your device:

**iOS (Safari):**
1. Open the site in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"

**Android (Chrome):**
1. Open the site in Chrome
2. Tap the menu (⋮)
3. Tap "Add to Home screen" or "Install app"

## License

MIT

## Author

Built as a proof of concept for quick LinkedIn networking and photo taking.

