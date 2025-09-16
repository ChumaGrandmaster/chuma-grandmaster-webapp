// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// Quote Form Handling
const quoteForm = document.getElementById('quoteForm');

if (quoteForm) {
    quoteForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        try {
            // Get form data
             const formData = new FormData(this);
             const firstName = formData.get('firstName');
             const lastName = formData.get('lastName');
             const projectType = formData.get('projectType');
             
             const quoteData = {
                  name: `${firstName} ${lastName}`.trim(),
                  email: formData.get('email'),
                  phone: formData.get('phone') || '',
                  company: formData.get('company') || '',
                  projectType: projectType,
                  budget: formData.get('budget') || 'under-5k',
                  timeline: formData.get('timeline') || 'flexible',
                  description: formData.get('description')
              };
             
             // Validate required fields
             if (!firstName || !lastName || !quoteData.email || 
                 !projectType || !quoteData.description) {
                 showMessage('Please fill in all required fields.', 'error');
                 return;
             }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(quoteData.email)) {
                showMessage('Please enter a valid email address.', 'error');
                return;
            }
            
            // Submit to API
            const response = await fetch('/api/quotes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(quoteData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage('Thank you! Your quote request has been submitted successfully. We\'ll get back to you within 24 hours.', 'success');
                this.reset();
                document.getElementById('quote').scrollIntoView({ behavior: 'smooth' });
            } else {
                const errorMessage = result.errors ? 
                    result.errors.map(err => err.msg).join(', ') : 
                    result.message || 'Failed to submit quote request';
                showMessage(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error submitting quote:', error);
            showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Show success/error messages
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message element
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message show' : 'error-message show';
    messageDiv.textContent = message;
    
    // Insert message at the top of the quote form
    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.insertBefore(messageDiv, quoteForm.firstChild);
        
        // Auto-hide message after 5 seconds
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => messageDiv.remove(), 300);
        }, 5000);
    }
}

// Form field validation on blur
document.querySelectorAll('.quote-form input, .quote-form select, .quote-form textarea').forEach(field => {
    field.addEventListener('blur', function() {
        validateField(this);
    });
    
    field.addEventListener('input', function() {
        // Remove validation styling on input
        this.classList.remove('invalid', 'valid');
    });
});

function validateField(field) {
    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');
    
    if (isRequired && !value) {
        field.classList.add('invalid');
        field.classList.remove('valid');
        return false;
    }
    
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            field.classList.add('invalid');
            field.classList.remove('valid');
            return false;
        }
    }
    
    if (value) {
        field.classList.add('valid');
        field.classList.remove('invalid');
    }
    
    return true;
}

// Animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.service-card, .portfolio-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Add loading class to body
    document.body.classList.add('loaded');
    
    // Initialize any additional features
    console.log('Chuma Grandmaster website loaded successfully!');
    
    // Check if there are any quote requests for admin notification
    const quotes = JSON.parse(localStorage.getItem('quoteRequests')) || [];
    if (quotes.length > 0) {
        console.log(`${quotes.length} quote request(s) available in admin panel`);
    }
});

// Utility function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// API utility functions
const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Export functions for admin panel
window.ChumaGrandmaster = {
    getQuoteRequests: async function(filters = {}) {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] && filters[key] !== 'all') {
                params.append(key, filters[key]);
            }
        });
        
        const queryString = params.toString();
        const endpoint = queryString ? `/quotes?${queryString}` : '/quotes';
        
        const result = await apiRequest(endpoint);
        return result.data || [];
    },
    
    getQuoteStats: async function() {
        const result = await apiRequest('/stats');
        return result.data || {};
    },
    
    updateQuoteStatus: async function(quoteId, status) {
        const result = await apiRequest(`/quotes/${quoteId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        return result.success;
    },
    
    deleteQuoteRequest: async function(quoteId) {
        const result = await apiRequest(`/quotes/${quoteId}`, {
            method: 'DELETE'
        });
        return result.success;
    },
    
    getQuoteById: async function(quoteId) {
        const result = await apiRequest(`/quotes/${quoteId}`);
        return result.data;
    },
    
    formatDate: formatDate
};