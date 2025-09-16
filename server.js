require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const DATA_FILE = path.join(__dirname, 'data', 'quotes.json');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Stricter rate limiting for quote submissions
const quoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 quote submissions per hour
  message: 'Too many quote submissions, please try again later.'
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Ensure data directory exists
fs.ensureDirSync(path.dirname(DATA_FILE));

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
    console.log('📧 Please check your Gmail credentials and App Password');
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Email notification function
const sendQuoteNotification = async (quoteData) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: 'ChumaGrandmaster@gmail.com',
    subject: `New Quote Request from ${quoteData.name}`,
    html: `
      <h2>New Quote Request Received</h2>
      <p><strong>Name:</strong> ${quoteData.name}</p>
      <p><strong>Email:</strong> ${quoteData.email}</p>
      <p><strong>Phone:</strong> ${quoteData.phone}</p>
      <p><strong>Company:</strong> ${quoteData.company || 'Not provided'}</p>
      <p><strong>Project Type:</strong> ${quoteData.projectType}</p>
      <p><strong>Budget:</strong> ${quoteData.budget}</p>
      <p><strong>Timeline:</strong> ${quoteData.timeline}</p>
      <p><strong>Description:</strong></p>
      <p>${quoteData.description}</p>
      <p><strong>Submitted:</strong> ${new Date(quoteData.createdAt).toLocaleString()}</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Quote notification email sent successfully');
    console.log('📧 Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending quote notification email:', error.message);
    if (error.code === 'EAUTH') {
      console.log('🔐 Authentication failed. Please check your Gmail App Password.');
    } else if (error.code === 'ECONNECTION') {
      console.log('🌐 Connection failed. Please check your internet connection.');
    }
    return { success: false, error: error.message };
  }
};

// Initialize quotes file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, []);
}

// Helper functions
const readQuotes = () => {
  try {
    return fs.readJsonSync(DATA_FILE);
  } catch (error) {
    console.error('Error reading quotes file:', error);
    return [];
  }
};

const writeQuotes = (quotes) => {
  try {
    fs.writeJsonSync(DATA_FILE, quotes, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error writing quotes file:', error);
    return false;
  }
};

// Validation middleware
const validateQuote = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters'),
  body('projectType')
    .trim()
    .isIn(['website', 'ecommerce', 'webapp', 'mobile', 'other'])
    .withMessage('Please select a valid project type'),
  body('budget')
    .trim()
    .isIn(['under-5k', '5k-10k', '10k-25k', '25k-50k', 'over-50k'])
    .withMessage('Please select a valid budget range'),
  body('timeline')
    .trim()
    .isIn(['asap', '1-month', '2-3-months', '3-6-months', 'flexible'])
    .withMessage('Please select a valid timeline'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters')
];

// API Routes

// Submit quote request
app.post('/api/quotes', quoteLimiter, validateQuote, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { name, email, phone, company, projectType, budget, timeline, description } = req.body;
  
  const newQuote = {
    id: uuidv4(),
    name,
    email,
    phone,
    company: company || '',
    projectType,
    budget,
    timeline,
    description,
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const quotes = readQuotes();
  quotes.push(newQuote);
  
  if (writeQuotes(quotes)) {
    // Send email notification
    sendQuoteNotification(newQuote);
    
    res.status(201).json({
      success: true,
      message: 'Quote request submitted successfully',
      data: { id: newQuote.id }
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to save quote request'
    });
  }
});

// Get all quotes (admin)
app.get('/api/quotes', (req, res) => {
  const quotes = readQuotes();
  const { status, projectType, sortBy = 'createdAt', order = 'desc' } = req.query;
  
  let filteredQuotes = quotes;
  
  // Apply filters
  if (status && status !== 'all') {
    filteredQuotes = filteredQuotes.filter(quote => quote.status === status);
  }
  
  if (projectType && projectType !== 'all') {
    filteredQuotes = filteredQuotes.filter(quote => quote.projectType === projectType);
  }
  
  // Sort quotes
  filteredQuotes.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (order === 'desc') {
      return new Date(bValue) - new Date(aValue);
    } else {
      return new Date(aValue) - new Date(bValue);
    }
  });
  
  res.json({
    success: true,
    data: filteredQuotes,
    total: filteredQuotes.length
  });
});

// Get single quote by ID
app.get('/api/quotes/:id', (req, res) => {
  const quotes = readQuotes();
  const quote = quotes.find(q => q.id === req.params.id);
  
  if (!quote) {
    return res.status(404).json({
      success: false,
      message: 'Quote not found'
    });
  }
  
  res.json({
    success: true,
    data: quote
  });
});

// Update quote status
app.patch('/api/quotes/:id/status', (req, res) => {
  const { status } = req.body;
  
  if (!['new', 'reviewed', 'contacted', 'quoted', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }
  
  const quotes = readQuotes();
  const quoteIndex = quotes.findIndex(q => q.id === req.params.id);
  
  if (quoteIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Quote not found'
    });
  }
  
  quotes[quoteIndex].status = status;
  quotes[quoteIndex].updatedAt = new Date().toISOString();
  
  if (writeQuotes(quotes)) {
    res.json({
      success: true,
      message: 'Quote status updated successfully',
      data: quotes[quoteIndex]
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to update quote status'
    });
  }
});

// Delete quote
app.delete('/api/quotes/:id', (req, res) => {
  const quotes = readQuotes();
  const quoteIndex = quotes.findIndex(q => q.id === req.params.id);
  
  if (quoteIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Quote not found'
    });
  }
  
  quotes.splice(quoteIndex, 1);
  
  if (writeQuotes(quotes)) {
    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to delete quote'
    });
  }
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
  const quotes = readQuotes();
  
  const stats = {
    total: quotes.length,
    new: quotes.filter(q => q.status === 'new').length,
    reviewed: quotes.filter(q => q.status === 'reviewed').length,
    contacted: quotes.filter(q => q.status === 'contacted').length,
    quoted: quotes.filter(q => q.status === 'quoted').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    rejected: quotes.filter(q => q.status === 'rejected').length
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, HOST, () => {
  if (process.env.NODE_ENV === 'production') {
    console.log(`🚀 Chuma Grandmaster Web App running on port ${PORT}`);
    console.log(`📊 Admin panel available at /admin`);
  } else {
    console.log(`🚀 Chuma Grandmaster Web App running on http://localhost:${PORT}`);
    console.log(`📊 Admin panel available at http://localhost:${PORT}/admin`);
  }
});

module.exports = app;