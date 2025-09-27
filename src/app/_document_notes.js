// In Next.js App Router, you can't use _document.js,
// but we can add metadata in the layout.tsx file.
// This file serves as documentation for viewport settings.

/*
Viewport settings applied in layout.tsx:
- width=device-width: Sets the width of the viewport to the width of the device
- initial-scale=1: Sets the initial zoom level when the page is first loaded
- minimum-scale=1: Prevents users from zooming out less than 100%
- maximum-scale=5: Allows users to zoom in up to 500%
- viewport-fit=cover: Ensures content fills the screen on devices with notches/rounded corners

Additional mobile optimizations:
- Added support for iOS PWA capabilities
- Set theme color for browser UI
- Added safe area insets handling in CSS
*/

// Empty export to make this a valid module
export {};
