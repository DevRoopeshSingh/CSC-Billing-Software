# CSC Center Billing Software - Deployment Guide

This guide outlines the steps required to build, package, and distribute the CSC Center Billing application for Windows and macOS.

## Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **npm** (v9 or higher)
3. **Build Tools** (Visual Studio build tools for Windows; Xcode command line tools for macOS)

## Environment Variables

Ensure you have your production environment variables set if required. By default, the application runs entirely offline.
If you are enabling auto-updates via GitHub Releases, make sure your `.env` or build environment includes a valid `GH_TOKEN`.

## Build and Package

We use `electron-builder` to create installers.

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Rebuild Native Modules (SQLite):**
   ```bash
   npm run rebuild:electron
   ```

3. **Generate Database Migrations (Optional for updates):**
   ```bash
   npm run db:push:drizzle
   ```

4. **Build the Final Installers:**
   ```bash
   npm run electron:build
   ```

   This command will:
   - Build the Next.js React frontend.
   - Compile the Electron main process.
   - Run `electron-builder` to generate `.exe` (Windows) and `.dmg` (macOS) in the `dist_electron` folder.

## Auto-Updater Configuration

The application is configured to use `electron-updater` hooked to GitHub Releases.

1. In `package.json`, verify the `publish` block:
   ```json
   "publish": [
     {
       "provider": "github"
     }
   ]
   ```
2. When you run `npm run electron:build -- -p always`, electron-builder will compile the app and automatically upload the drafts to your GitHub repository's Releases page.
3. Publish the release on GitHub. The desktop clients will automatically detect it, download the `.exe` in the background, and prompt users to restart.

## S3 Cloud Backup

To use the cloud sync feature, users must configure their AWS S3 or Supabase Storage credentials in the app's `Settings -> Backup` UI.

**Required:**
- S3 Access Key
- S3 Secret Key
- Endpoint URL (e.g., `https://s3.ap-south-1.amazonaws.com`)
- Bucket Name
- 32-character Encryption Key (used for AES-256-GCM encryption before upload)
