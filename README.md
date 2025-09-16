# Chuma Grandmaster Web Application

A professional website design services web application with dark theme, contact forms, and email notifications.

## Features

- 🎨 Modern dark theme design
- 📧 Email notification system
- 📱 Responsive mobile design
- 🛡️ Security features (rate limiting, CORS, helmet)
- 📊 Admin panel for quote management
- ⚡ Fast and optimized performance

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env` and update with your Gmail credentials
   - Use Gmail App Password (not regular password)

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## Vercel Deployment

### Quick Deploy

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Gmail App Password
   - `NODE_ENV`: production

### Manual Deploy

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables:
```bash
vercel env add EMAIL_USER
vercel env add EMAIL_PASS
vercel env add NODE_ENV
```

## Gmail Setup for Email Notifications

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings → Security → 2-Step Verification
3. Scroll to "App passwords" and generate a new password
4. Use this App Password (not your regular Gmail password)

## Project Structure

```
├── server.js          # Main server file
├── index.html         # Homepage
├── admin.html         # Admin panel
├── styles.css         # Main styles (dark theme)
├── script.js          # Frontend JavaScript
├── admin-script.js    # Admin panel JavaScript
├── data/
│   └── quotes.json    # Quote submissions storage
├── vercel.json        # Vercel configuration
└── package.json       # Dependencies
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting
- **Styling**: CSS3 with dark theme
- **Deployment**: Vercel

## License

MIT License - see package.json for details.