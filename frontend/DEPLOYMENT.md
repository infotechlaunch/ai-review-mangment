# Bluehost Deployment Guide

## Prerequisites

- Bluehost hosting account with cPanel access
- Domain configured and pointing to your Bluehost server
- Backend API deployed and accessible

## Step 1: Configure Environment Variables

1. Update `.env.production` with your production settings:
   ```
   VITE_API_URL=https://your-backend-domain.com/api
   ```

## Step 2: Build the Application

Run the build command locally:

```bash
npm run build
```

This will create a `dist` folder with optimized production files.

## Step 3: Upload to Bluehost

### Option A: Using cPanel File Manager (Recommended for beginners)

1. Log in to your Bluehost cPanel
2. Open **File Manager**
3. Navigate to `public_html` (or your domain's root directory)
4. Delete any existing files in the directory (backup first if needed)
5. Upload all contents from the `dist` folder to `public_html`:
   - Upload the `.htaccess` file
   - Upload the `index.html` file
   - Upload the `assets` folder
   - Upload any other files from the `dist` folder

### Option B: Using FTP (FileZilla recommended)

1. Download and install FileZilla (https://filezilla-project.org/)
2. Connect to your Bluehost server using FTP credentials:
   - Host: ftp.yourdomain.com
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21
3. Navigate to `public_html` on the remote server
4. Delete existing files (backup first)
5. Upload all contents from the `dist` folder

### Option C: Using SSH/Terminal (Advanced)

```bash
# Connect to your Bluehost server via SSH
ssh username@yourdomain.com

# Navigate to public_html
cd public_html

# Remove old files (be careful!)
rm -rf *

# Exit SSH
exit

# From your local machine, use SCP to upload
scp -r dist/* username@yourdomain.com:~/public_html/
```

## Step 4: Verify .htaccess Configuration

Ensure the `.htaccess` file is in the root of `public_html`. This file:

- Handles React Router routing
- Redirects HTTP to HTTPS
- Enables GZIP compression
- Sets browser caching headers
- Adds security headers

## Step 5: Configure SSL Certificate

1. In cPanel, go to **SSL/TLS Status**
2. Enable AutoSSL if not already enabled
3. Wait for the certificate to be installed (usually takes a few minutes)
4. Verify HTTPS is working by visiting your domain

## Step 6: Update Backend CORS Settings

Make sure your backend allows requests from your frontend domain:

```javascript
// In your backend configuration
const corsOptions = {
  origin: ["https://yourdomain.com", "https://www.yourdomain.com"],
  credentials: true,
};
```

## Step 7: Test the Deployment

1. Visit your domain: `https://yourdomain.com`
2. Test all major features:
   - Login/Authentication
   - Navigation between pages
   - API calls to backend
   - Review management features
3. Check browser console for any errors
4. Test on different browsers (Chrome, Firefox, Safari)
5. Test on mobile devices

## Troubleshooting

### 404 Errors on Page Refresh

- Ensure `.htaccess` file is uploaded and contains the rewrite rules
- Check that `mod_rewrite` is enabled in Apache (usually enabled by default on Bluehost)

### API Connection Issues

- Verify `VITE_API_URL` in `.env.production` is correct
- Check CORS settings on backend
- Ensure backend is accessible from the frontend domain

### White Screen / Blank Page

- Check browser console for errors
- Verify all files were uploaded correctly
- Check that `index.html` is in the root directory
- Clear browser cache and try again

### Mixed Content Errors (HTTP/HTTPS)

- Ensure all API calls use HTTPS
- Check that backend URL in `.env.production` uses HTTPS
- Verify SSL certificate is properly installed

### Assets Not Loading

- Check that the `assets` folder was uploaded
- Verify file permissions (should be 644 for files, 755 for directories)
- Check browser network tab for 404 errors

## File Permissions

Recommended permissions for Bluehost:

- Directories: 755
- Files: 644
- .htaccess: 644

Set permissions in cPanel File Manager or via SSH:

```bash
find public_html -type d -exec chmod 755 {} \;
find public_html -type f -exec chmod 644 {} \;
```

## Updating the Application

When you make changes:

1. Update your local code
2. Run `npm run build`
3. Upload only the changed files from the `dist` folder
4. Clear browser cache to see changes

Or upload all files from `dist` folder to replace everything.

## Performance Optimization

The build is already optimized with:

- ✅ Code minification
- ✅ Asset optimization
- ✅ GZIP compression
- ✅ Browser caching
- ✅ Code splitting

## Monitoring

- Use browser DevTools to monitor performance
- Check Bluehost resource usage in cPanel
- Monitor backend API response times
- Set up uptime monitoring (e.g., UptimeRobot, Pingdom)

## Support

If you encounter issues:

1. Check Bluehost documentation: https://www.bluehost.com/help
2. Contact Bluehost support (24/7 available)
3. Review browser console errors
4. Check backend logs

## Backup

Always keep backups:

- Download current `public_html` contents before deploying
- Use Bluehost's backup feature in cPanel
- Keep a local copy of your `dist` folder
