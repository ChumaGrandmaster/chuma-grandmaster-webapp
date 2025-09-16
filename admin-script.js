// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.quotes = [];
        this.filteredQuotes = [];
        this.currentFilter = { status: 'all', projectType: 'all' };
        this.init();
    }

    async init() {
        try {
            await this.loadQuotes();
            await this.updateStats();
            this.renderQuotes();
            this.bindEvents();
            console.log('Admin Panel initialized successfully');
        } catch (error) {
            console.error('Failed to initialize admin panel:', error);
            this.showAlert('Failed to load data. Please refresh the page.', 'error');
        }
    }

    async loadQuotes() {
        try {
            const filters = {
                status: this.currentFilter.status,
                projectType: this.currentFilter.projectType
            };
            
            if (window.ChumaGrandmaster && window.ChumaGrandmaster.getQuoteRequests) {
                this.quotes = await window.ChumaGrandmaster.getQuoteRequests(filters);
            } else {
                // Fallback API call
                const params = new URLSearchParams();
                Object.keys(filters).forEach(key => {
                    if (filters[key] && filters[key] !== 'all') {
                        params.append(key, filters[key]);
                    }
                });
                
                const response = await fetch(`/api/quotes?${params.toString()}`);
                const result = await response.json();
                this.quotes = result.data || [];
            }
            
            this.filteredQuotes = [...this.quotes];
        } catch (error) {
            console.error('Error loading quotes:', error);
            this.quotes = JSON.parse(localStorage.getItem('quoteRequests')) || [];
            this.filteredQuotes = [...this.quotes];
        }
    }

    bindEvents() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refresh();
        });

        // Filter events
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentFilter.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('projectTypeFilter').addEventListener('change', (e) => {
            this.currentFilter.projectType = e.target.value;
            this.applyFilters();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Delete all button
        document.getElementById('deleteAllBtn').addEventListener('click', () => {
            this.confirmDeleteAll();
        });

        // Modal events
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('confirmCancel').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        });
    }

    refresh() {
        const refreshBtn = document.getElementById('refreshBtn');
        const icon = refreshBtn.querySelector('i');
        
        icon.classList.add('loading');
        
        setTimeout(() => {
            this.loadQuotes();
            this.updateStats();
            this.renderQuotes();
            icon.classList.remove('loading');
            this.showAlert('Data refreshed successfully!', 'success');
        }, 500);
    }

    async updateStats() {
        try {
            let stats;
            
            if (window.ChumaGrandmaster && window.ChumaGrandmaster.getQuoteStats) {
                stats = await window.ChumaGrandmaster.getQuoteStats();
            } else {
                // Fallback API call
                const response = await fetch('/api/stats');
                const result = await response.json();
                stats = result.data || {};
            }

            document.getElementById('totalQuotes').textContent = stats.total || this.quotes.length;
            document.getElementById('newQuotes').textContent = stats.new || this.quotes.filter(q => q.status === 'new').length;
            document.getElementById('inProgressQuotes').textContent = stats.inProgress || this.quotes.filter(q => q.status === 'in-progress').length;
            document.getElementById('completedQuotes').textContent = stats.completed || this.quotes.filter(q => q.status === 'completed').length;
        } catch (error) {
            console.error('Error updating stats:', error);
            // Fallback to local calculation
            const total = this.quotes.length;
            const newQuotes = this.quotes.filter(q => q.status === 'new').length;
            const inProgress = this.quotes.filter(q => q.status === 'in-progress').length;
            const completed = this.quotes.filter(q => q.status === 'completed').length;

            document.getElementById('totalQuotes').textContent = total;
            document.getElementById('newQuotes').textContent = newQuotes;
            document.getElementById('inProgressQuotes').textContent = inProgress;
            document.getElementById('completedQuotes').textContent = completed;
        }
    }

    async applyFilters() {
        try {
            await this.loadQuotes(); // Reload with new filters
            this.renderQuotes();
        } catch (error) {
            console.error('Error applying filters:', error);
            // Fallback to local filtering
            this.filteredQuotes = this.quotes.filter(quote => {
                const statusMatch = this.currentFilter.status === 'all' || quote.status === this.currentFilter.status;
                const typeMatch = this.currentFilter.projectType === 'all' || quote.projectType === this.currentFilter.projectType;
                return statusMatch && typeMatch;
            });
            this.renderQuotes();
            this.showAlert('Failed to apply filters. Using local data.', 'warning');
        }
    }

    clearFilters() {
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('projectTypeFilter').value = 'all';
        this.currentFilter = { status: 'all', projectType: 'all' };
        this.filteredQuotes = [...this.quotes];
        this.renderQuotes();
    }

    renderQuotes() {
        const tbody = document.getElementById('quotesTableBody');
        const noQuotes = document.getElementById('noQuotes');
        const table = document.getElementById('quotesTable');

        if (this.filteredQuotes.length === 0) {
            table.style.display = 'none';
            noQuotes.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        noQuotes.style.display = 'none';

        tbody.innerHTML = '';

        // Sort quotes by date (newest first)
        const sortedQuotes = [...this.filteredQuotes].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        sortedQuotes.forEach(quote => {
            const row = this.createQuoteRow(quote);
            tbody.appendChild(row);
        });
    }

    createQuoteRow(quote) {
        const row = document.createElement('tr');
        
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const getStatusClass = (status) => {
            const statusClasses = {
                'new': 'status-new',
                'in-progress': 'status-in-progress',
                'completed': 'status-completed',
                'rejected': 'status-rejected'
            };
            return statusClasses[status] || 'status-new';
        };

        const formatProjectType = (type) => {
            const types = {
                'new-website': 'New Website',
                'redesign': 'Website Redesign',
                'ecommerce': 'E-commerce Store',
                'maintenance': 'Website Maintenance',
                'other': 'Other'
            };
            return types[type] || type;
        };

        const formatBudget = (budget) => {
            const budgets = {
                'under-1000': 'Under $1,000',
                '1000-5000': '$1,000 - $5,000',
                '5000-10000': '$5,000 - $10,000',
                '10000-plus': '$10,000+'
            };
            return budgets[budget] || budget || 'Not specified';
        };

        const formatTimeline = (timeline) => {
            const timelines = {
                'asap': 'ASAP',
                '1-month': 'Within 1 Month',
                '2-3-months': '2-3 Months',
                'flexible': 'Flexible'
            };
            return timelines[timeline] || timeline || 'Not specified';
        };

        row.innerHTML = `
            <td>${formatDate(quote.timestamp)}</td>
            <td>
                <div class="client-info">
                    <div class="client-name">${quote.firstName} ${quote.lastName}</div>
                    <div class="client-company">${quote.company}</div>
                </div>
            </td>
            <td>
                <div class="contact-info">
                    <a href="mailto:${quote.email}" class="contact-email">${quote.email}</a>
                    <div class="contact-phone">${quote.phone}</div>
                </div>
            </td>
            <td>${formatProjectType(quote.projectType)}</td>
            <td>${formatBudget(quote.budget)}</td>
            <td>${formatTimeline(quote.timeline)}</td>
            <td>
                <span class="status-badge ${getStatusClass(quote.status)}">${quote.status}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.viewQuote('${quote.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <select class="status-select" onchange="adminPanel.updateStatus('${quote.id}', this.value)">
                        <option value="">Change Status</option>
                        <option value="new" ${quote.status === 'new' ? 'selected' : ''}>New</option>
                        <option value="in-progress" ${quote.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${quote.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="rejected" ${quote.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteQuote('${quote.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    viewQuote(quoteId) {
        const quote = this.quotes.find(q => q.id === quoteId);
        if (!quote) return;

        const modalBody = document.getElementById('quoteModalBody');
        
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const formatProjectType = (type) => {
            const types = {
                'new-website': 'New Website',
                'redesign': 'Website Redesign',
                'ecommerce': 'E-commerce Store',
                'maintenance': 'Website Maintenance',
                'other': 'Other'
            };
            return types[type] || type;
        };

        const formatBudget = (budget) => {
            const budgets = {
                'under-1000': 'Under $1,000',
                '1000-5000': '$1,000 - $5,000',
                '5000-10000': '$5,000 - $10,000',
                '10000-plus': '$10,000+'
            };
            return budgets[budget] || budget || 'Not specified';
        };

        const formatTimeline = (timeline) => {
            const timelines = {
                'asap': 'ASAP',
                '1-month': 'Within 1 Month',
                '2-3-months': '2-3 Months',
                'flexible': 'Flexible'
            };
            return timelines[timeline] || timeline || 'Not specified';
        };

        modalBody.innerHTML = `
            <div class="quote-detail">
                <div class="detail-item">
                    <div class="detail-label">Client Name</div>
                    <div class="detail-value">${quote.firstName} ${quote.lastName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${quote.email}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value">${quote.phone}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Company</div>
                    <div class="detail-value">${quote.company}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Project Type</div>
                    <div class="detail-value">${formatProjectType(quote.projectType)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Budget Range</div>
                    <div class="detail-value">${formatBudget(quote.budget)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Timeline</div>
                    <div class="detail-value">${formatTimeline(quote.timeline)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status-badge ${this.getStatusClass(quote.status)}">${quote.status}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Submitted</div>
                    <div class="detail-value">${formatDate(quote.timestamp)}</div>
                </div>
            </div>
            <div class="description-section">
                <h4>Project Description</h4>
                <div class="description-text">${quote.description}</div>
            </div>
        `;

        this.showModal('quoteModal');
    }

    getStatusClass(status) {
        const statusClasses = {
            'new': 'status-new',
            'in-progress': 'status-in-progress',
            'completed': 'status-completed',
            'rejected': 'status-rejected'
        };
        return statusClasses[status] || 'status-new';
    }

    async updateStatus(quoteId, newStatus) {
        if (!newStatus) return;
        
        try {
            let success = false;
            
            if (window.ChumaGrandmaster && window.ChumaGrandmaster.updateQuoteStatus) {
                success = await window.ChumaGrandmaster.updateQuoteStatus(quoteId, newStatus);
            } else {
                // Fallback API call
                const response = await fetch(`/api/quotes/${quoteId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                const result = await response.json();
                success = result.success;
            }
            
            if (success) {
                await this.loadQuotes();
                await this.updateStats();
                this.renderQuotes();
                this.showAlert(`Quote status updated to ${newStatus}`, 'success');
            } else {
                this.showAlert('Failed to update quote status.', 'error');
            }
        } catch (error) {
            console.error('Error updating quote status:', error);
            // Fallback to localStorage update
            const quoteIndex = this.quotes.findIndex(q => q.id === quoteId);
            if (quoteIndex !== -1) {
                this.quotes[quoteIndex].status = newStatus;
                this.quotes[quoteIndex].updatedAt = new Date().toISOString();
                localStorage.setItem('quoteRequests', JSON.stringify(this.quotes));
                
                this.updateStats();
                this.applyFilters();
                this.showAlert(`Quote status updated to ${newStatus} (local only)`, 'warning');
            }
        }
    }

    async deleteQuote(quoteId) {
        const quote = this.quotes.find(q => q.id === quoteId);
        if (!quote) return;

        this.showConfirmModal(
            `Are you sure you want to delete the quote request from ${quote.firstName} ${quote.lastName}?`,
            async () => {
                try {
                    let success = false;
                    
                    if (window.ChumaGrandmaster && window.ChumaGrandmaster.deleteQuoteRequest) {
                        success = await window.ChumaGrandmaster.deleteQuoteRequest(quoteId);
                    } else {
                        // Fallback API call
                        const response = await fetch(`/api/quotes/${quoteId}`, {
                            method: 'DELETE'
                        });
                        const result = await response.json();
                        success = result.success;
                    }
                    
                    if (success) {
                        await this.loadQuotes();
                        await this.updateStats();
                        this.renderQuotes();
                        this.showAlert('Quote request deleted successfully', 'success');
                    } else {
                        this.showAlert('Failed to delete quote request.', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting quote:', error);
                    // Fallback to localStorage deletion
                    this.quotes = this.quotes.filter(q => q.id !== quoteId);
                    localStorage.setItem('quoteRequests', JSON.stringify(this.quotes));
                    
                    this.updateStats();
                    this.applyFilters();
                    this.showAlert('Quote request deleted (local only)', 'warning');
                }
                this.closeModal();
            }
        );
    }

    confirmDeleteAll() {
        if (this.quotes.length === 0) {
            this.showAlert('No quote requests to delete', 'info');
            return;
        }

        this.showConfirmModal(
            `Are you sure you want to delete all ${this.quotes.length} quote requests? This action cannot be undone.`,
            () => {
                localStorage.removeItem('quoteRequests');
                this.quotes = [];
                this.filteredQuotes = [];
                
                this.updateStats();
                this.renderQuotes();
                this.showAlert('All quote requests deleted successfully', 'success');
                this.closeModal();
            }
        );
    }

    exportToCSV() {
        if (this.filteredQuotes.length === 0) {
            this.showAlert('No data to export', 'info');
            return;
        }

        const headers = [
            'Date', 'First Name', 'Last Name', 'Email', 'Phone', 'Company',
            'Project Type', 'Budget', 'Timeline', 'Status', 'Description'
        ];

        const csvContent = [
            headers.join(','),
            ...this.filteredQuotes.map(quote => [
                new Date(quote.timestamp).toLocaleDateString(),
                quote.firstName,
                quote.lastName,
                quote.email,
                quote.phone,
                quote.company,
                quote.projectType,
                quote.budget,
                quote.timeline,
                quote.status,
                `"${quote.description.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote-requests-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showAlert('Quote requests exported successfully', 'success');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = 'auto';
    }

    showConfirmModal(message, onConfirm) {
        document.getElementById('confirmMessage').textContent = message;
        
        const confirmBtn = document.getElementById('confirmAction');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', onConfirm);
        
        this.showModal('confirmModal');
    }

    showAlert(message, type = 'info') {
        // Remove existing alerts
        document.querySelectorAll('.alert').forEach(alert => alert.remove());
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Initialize admin panel when DOM is loaded
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

// Add CSS for status select
const style = document.createElement('style');
style.textContent = `
    .status-select {
        padding: 0.25rem 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.75rem;
        background: white;
        margin: 0.25rem 0;
    }
    
    .status-select:focus {
        outline: none;
        border-color: #2563eb;
    }
`;
document.head.appendChild(style);