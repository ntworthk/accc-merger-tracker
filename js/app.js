/**
 * app.js - Main application logic for the Merger Tracker application
 * Initializes components and handles global app functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // Application state
    const App = {
        // Initialize the application
        init: async () => {
            console.log('Initializing Merger Tracker application...');
            
            // Set up event listeners
            App.setupEventListeners();
            
            // Initialize the router
            Router.init();
            
            // Update last update date
            App.updateLastUpdateDate();
        },
        
        // Set up global event listeners
        setupEventListeners: () => {
            // Toggle sidebar
            document.getElementById('sidebar-toggle').addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.toggle('collapsed');
                
                // For mobile devices
                if (window.innerWidth <= 992) {
                    sidebar.classList.toggle('show');
                }
                
                document.querySelector('.main-content').classList.toggle('expanded');
            });
            
            // Global search
            const searchInput = document.getElementById('search-input');
            const searchButton = document.getElementById('search-button');
            
            searchButton.addEventListener('click', () => {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    Router.goToMergersList({ search: searchTerm });
                }
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const searchTerm = searchInput.value.trim();
                    if (searchTerm) {
                        Router.goToMergersList({ search: searchTerm });
                    }
                }
            });
            
            // Refresh button
            document.getElementById('refresh-button').addEventListener('click', () => {
                // Reload current route
                const currentRoute = Router.getCurrentRoute();
                const currentParams = Router.getCurrentParams();
                Router.navigate(currentRoute, currentParams);
                
                // Update last update date
                App.updateLastUpdateDate();
            });
            
            // Modal close button
            document.getElementById('modal-close').addEventListener('click', () => {
                App.closeModal();
            });
            
            // Close sidebar when clicking outside on mobile
            document.querySelector('.main-content').addEventListener('click', (e) => {
                if (window.innerWidth <= 992) {
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar.classList.contains('show')) {
                        sidebar.classList.remove('show');
                    }
                }
            });
        },
        
        // Update the last update date
        updateLastUpdateDate: async () => {
            try {
                const lastUpdate = await API.getLastUpdateDate();
                document.getElementById('last-update-date').textContent = 
                    new Date(lastUpdate).toLocaleString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
            } catch (error) {
                console.error('Error fetching last update date:', error);
                document.getElementById('last-update-date').textContent = 'Unknown';
            }
        },
        
        // Show the merger details modal
        showMergerModal: async (mergerId) => {
            try {
                const merger = await API.getMergerById(mergerId);
                
                // Set modal title
                document.getElementById('modal-title').textContent = merger.title;
                
                // Set modal content
                const modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = `
                    <div class="merger-modal-content">
                        <div class="merger-modal-header">
                            <div class="merger-badges">
                                ${Formatters.statusBadge(merger.status)}
                                ${merger.is_subject_to_conditions ? '<span class="badge badge-warning">Conditions</span>' : ''}
                            </div>
                        </div>
                        <div class="merger-modal-details">
                            <div class="modal-detail-row">
                                <div class="modal-detail-label">Acquirer:</div>
                                <div class="modal-detail-value">${merger.acquirer.name}</div>
                            </div>
                            <div class="modal-detail-row">
                                <div class="modal-detail-label">Target:</div>
                                <div class="modal-detail-value">${merger.target.name}</div>
                            </div>
                            <div class="modal-detail-row">
                                <div class="modal-detail-label">Notification Date:</div>
                                <div class="modal-detail-value">${DateUtils.formatDate(merger.notification_date)}</div>
                            </div>
                            <div class="modal-detail-row">
                                <div class="modal-detail-label">Description:</div>
                                <div class="modal-detail-value">${merger.description}</div>
                            </div>
                        </div>
                        <div class="merger-modal-timeline">
                            ${Timeline.createSimpleTimeline(merger)}
                        </div>
                    </div>
                `;
                
                // Set view full details button
                document.getElementById('modal-view-full').onclick = () => {
                    App.closeModal();
                    Router.goToMergerDetail({ id: mergerId });
                };
                
                // Show the modal
                document.getElementById('merger-modal').classList.add('show');
            } catch (error) {
                console.error('Error fetching merger details:', error);
                App.showNotification('Error', 'Could not retrieve merger details.', 'error');
            }
        },
        
        // Close the merger details modal
        closeModal: () => {
            document.getElementById('merger-modal').classList.remove('show');
        },
        
        // Show a notification
        showNotification: (title, message, type = 'info') => {
            // Create notification element if it doesn't exist
            let notification = document.querySelector('.notification');
            if (!notification) {
                notification = document.createElement('div');
                notification.className = 'notification';
                document.body.appendChild(notification);
            }
            
            // Set notification content
            notification.innerHTML = `
                <div class="notification-icon">
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Add notification type class
            notification.className = `notification notification-${type}`;
            
            // Show the notification
            setTimeout(() => notification.classList.add('show'), 10);
            
            // Set up close button
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            });
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (notification.classList.contains('show')) {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
        },
        
        // Export the current view data
        exportCurrentView: () => {
            const currentRoute = Router.getCurrentRoute();
            
            // Different export logic based on current route
            switch (currentRoute) {
                case 'mergers-list':
                    MergersList.exportData();
                    break;
                    
                case 'merger-detail':
                    MergerDetail.exportData();
                    break;
                    
                case 'statistics':
                    Statistics.exportData();
                    break;
                    
                case 'dashboard':
                    Dashboard.exportData();
                    break;
                    
                default:
                    App.showNotification('Export not available', 'Export is not available for this view.', 'warning');
            }
        },
        
        // Export data to CSV
        exportToCSV: (data, filename) => {
            if (!data || !data.length) {
                App.showNotification('Export error', 'No data available to export.', 'error');
                return;
            }
            
            // Convert data to CSV format
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(item => 
                Object.values(item).map(value => 
                    typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                ).join(',')
            );
            
            const csv = [headers, ...rows].join('\n');
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.display = 'none';
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            App.showNotification('Export complete', `Data exported to ${filename}`, 'success');
        }
    };
    
    // Initialize the application
    App.init();
    
    // Make App available globally
    window.App = App;
});