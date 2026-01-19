# Quick Deployment Checklist

## 🚀 5-Minute Deployment to Bluehost

### 1. Configure (1 minute)

```bash
# Edit .env.production and set your backend URL
VITE_API_URL=https://your-backend-api.com/api
```

### 2. Build (1 minute)

```bash
npm run build
```

### 3. Upload (3 minutes)

- Log in to Bluehost cPanel
- Open File Manager
- Go to `public_html`
- Delete old files
- Upload ALL files from `dist` folder:
  - ✅ index.html
  - ✅ .htaccess
  - ✅ assets/ folder
  - ✅ All other files

### 4. Test

- Visit: https://yourdomain.com
- Check login works
- Verify API connections

## ⚠️ Important Files to Upload

- `index.html` - Main HTML file
- `.htaccess` - React Router support & optimizations
- `assets/` - All CSS, JS, and image files

## 🔧 Common Issues

- **404 on refresh**: Check `.htaccess` is uploaded
- **API errors**: Update `.env.production` with correct backend URL
- **Blank page**: Check browser console, verify all files uploaded

## 📁 Directory Structure on Bluehost

```
public_html/
├── index.html
├── .htaccess
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── [other assets]
```

Done! 🎉
