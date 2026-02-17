// Simple script to generate placeholder PWA icons
import fs from 'fs';

// Create a simple SVG icon
const createSVG = (size) => `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0072b1"/>
  <text x="50%" y="50%" font-size="${size/4}" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold">LI</text>
</svg>`;

// Write SVG files
fs.writeFileSync('public/icon-192.svg', createSVG(192));
fs.writeFileSync('public/icon-512.svg', createSVG(512));

console.log('SVG icons created. To convert to PNG, run:');
console.log('If you have ImageMagick: convert public/icon-192.svg public/icon-192.png');
console.log('Or use an online converter for production.');
