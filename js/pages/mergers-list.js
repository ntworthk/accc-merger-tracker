/**
 * mergers-list.js - Mergers list page controller for the Merger Tracker application
 * Displays a filterable list of all mergers
 */

const MergersList = (() => {
    // Page state
    let currentPage = 1;
    let pageSize = 10;
    let totalItems = 0;
    let currentFilters = {};
    let currentSortField = 'notification_date';
    let currentSortOrder = 'desc';
    let allMergers = [];
    
    // Initialize the mergers list
    const init = async (params = {}) => {
        try {
            // Reset pagination
            currentPage = parseInt(params.page) || 1;
            
            // Set initial filters from URL params
            currentFilters = {
                status: params.status || 'all',
                dateFrom: params.dateFrom || '',
                dateTo: params.dateTo || '',
                industry: params.industry || 'all',
                search: params.search || ''
            };
            
            // Apply filters to form elements
            applyFiltersToForm();
            
            // Load industries for filter dropdown
            await loadIndustries();
            
            // Load and render mergers
            await loadMergers();
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing mergers list:', error);
            App.showNotification('Error', 'Failed to load mergers list.', 'error');
        }
    };
    
    // Apply current filters to form elements
    const applyFiltersToForm = () => {
        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.value = currentFilters.status;
        }
        
        // Date filters
        const dateFrom = document.getElementById('date-from');
        if (dateFrom) {
            dateFrom.value = currentFilters.dateFrom;
        }
        
        const dateTo = document.getElementById('date-to');
        if (dateTo) {
            dateTo.value = currentFilters.dateTo;
        }
        
        // Industry filter
        const industryFilter = document.getElementById('industry-filter');
        if (industryFilter && currentFilters.industry !== 'all') {
            // Will be set after industries are loaded
            industryFilter.value = currentFilters.industry;
        }
        
        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput && currentFilters.search) {
            searchInput.value = currentFilters.search;
        }
    };
    
    // Load industries for the filter dropdown
    const loadIndustries = async () => {
        try {
            const industries = await API.getIndustries();
            const industryFilter = document.getElementById('industry-filter');
            
            if (industryFilter) {
                // Keep the "All Industries" option
                let options = '<option value="all">All Industries</option>';
                
                // Add each industry
                industries.forEach(industry => {
                    options += `<option value="${industry}">${industry}</option>`;
                });
                
                industryFilter.innerHTML = options;
                
                // Set selected value from filters
                if (currentFilters.industry) {
                    industryFilter.value = currentFilters.industry;
                }
            }
        } catch (error) {
            console.error('Error loading industries:', error);
        }
    };
    
    // Load mergers with current filters and pagination
    const loadMergers = async () => {
        try {
            // Show loading state
            document.querySelector('.mergers-table tbody').innerHTML = 
                '<tr><td colspan="8" class="no-data">Loading mergers...</td></tr>';
            
            // Prepare API request
            const requestFilters = {
                ...currentFilters,
                page: currentPage,
                pageSize: pageSize,
                sortField: currentSortField,
                sortOrder: currentSortOrder
            };
            
            // Fetch mergers from API
            const result = await API.getMergers(requestFilters);
            
            // Save total for pagination
            totalItems = result.total;
            allMergers = result.data;
            
            // Render mergers
            renderMergers(result.data);
            
            // Update pagination
            updatePagination();
            
        } catch (error) {
            console.error('Error loading mergers:', error);
            document.querySelector('.mergers-table tbody').innerHTML = 
                '<tr><td colspan="8" class="no-data">Error loading mergers</td></tr>';
        }
    };
    
    // Render mergers in the table
    const renderMergers = (mergers) => {
        const tableBody = document.querySelector('.mergers-table tbody');
        
        if (!mergers || mergers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="no-data">No mergers found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        
        mergers.forEach(merger => {
            const { text: statusText, className: statusClass } = Formatters.formatStatus(merger.status);
            
            // Determine current phase
            let currentPhase = 'N/A';
            let expectedCompletion = 'N/A';
            
            if (merger.phase1 && !merger.phase1.actual_end_date) {
                currentPhase = 'Phase 1';
                expectedCompletion = merger.phase1.expected_end_date;
            } else if (merger.phase2 && !merger.phase2.actual_end_date) {
                currentPhase = 'Phase 2';
                expectedCompletion = merger.phase2.expected_end_date;
            } else if (merger.public_benefit && !merger.public_benefit.actual_determination_date) {
                currentPhase = 'Public Benefit';
                expectedCompletion = merger.public_benefit.expected_determination_date;
            } else if (merger.status === 'completed' || merger.status === 'rejected' || merger.status === 'withdrawn') {
                currentPhase = 'Completed';
                
                // Find the most recent end date
                if (merger.public_benefit && merger.public_benefit.actual_determination_date) {
                    expectedCompletion = merger.public_benefit.actual_determination_date;
                } else if (merger.phase2 && merger.phase2.actual_end_date) {
                    expectedCompletion = merger.phase2.actual_end_date;
                } else if (merger.phase1 && merger.phase1.actual_end_date) {
                    expectedCompletion = merger.phase1.actual_end_date;
                }
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="cell-with-icon">
                    <i class="fas ${Formatters.getStatusIcon(merger.status)}"></i>
                    ${merger.title}
                </td>
                <td>${merger.acquirer.name}</td>
                <td>${merger.target.name}</td>
                <td>${DateUtils.formatDate(merger.notification_date)}</td>
                <td class="cell-status">
                    <span class="status-badge ${statusClass}">
                        <i class="fas fa-circle"></i>
                        ${statusText}
                    </span>
                </td>
                <td>${currentPhase}</td>
                <td>${DateUtils.formatDate(expectedCompletion)}</td>
                <td class="table-actions">
                    <div class="action-buttons">
                        <button class="action-btn view-details" data-merger-id="${merger.merger_id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn quick-view" data-merger-id="${merger.merger_id}" title="Quick View">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add event listeners for action buttons
            tr.querySelector('.view-details').addEventListener('click', (e) => {
                e.stopPropagation();
                Router.goToMergerDetail({ id: merger.merger_id });
            });
            
            tr.querySelector('.quick-view').addEventListener('click', (e) => {
                e.stopPropagation();
                App.showMergerModal(merger.merger_id);
            });
            
            // Row click navigates to detail view
            tr.addEventListener('click', () => {
                Router.goToMergerDetail({ id: merger.merger_id });
            });
            
            tableBody.appendChild(tr);
        });
    };
    
    // Update pagination controls
    const updatePagination = () => {
        const totalPages = Math.ceil(totalItems / pageSize);
        const paginationInfo = document.getElementById('pagination-info');
        const prevButton = document.getElementById('pagination-prev');
        const nextButton = document.getElementById('pagination-next');
        
        if (paginationInfo) {
            paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }
        
        if (prevButton) {
            prevButton.disabled = currentPage <= 1;
            prevButton.classList.toggle('disabled', currentPage <= 1);
        }
        
        if (nextButton) {
            nextButton.disabled = currentPage >= totalPages;
            nextButton.classList.toggle('disabled', currentPage >= totalPages);
        }
    };
    
    // Set up event listeners for filters and pagination
    const setupEventListeners = () => {
        // Filter apply button
        const filterApplyButton = document.getElementById('filter-apply');
        if (filterApplyButton) {
            filterApplyButton.addEventListener('click', () => {
                applyFilters();
            });
        }
        
        // Filter reset button
        const filterResetButton = document.getElementById('filter-reset');
        if (filterResetButton) {
            filterResetButton.addEventListener('click', () => {
                resetFilters();
            });
        }
        
        // Pagination buttons
        const prevButton = document.getElementById('pagination-prev');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    navigateWithCurrentSettings();
                }
            });
        }
        
        const nextButton = document.getElementById('pagination-next');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const totalPages = Math.ceil(totalItems / pageSize);
                if (currentPage < totalPages) {
                    currentPage++;
                    navigateWithCurrentSettings();
                }
            });
        }
        
        // Column sorting
        document.querySelectorAll('.mergers-table th.sortable-header').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.field;
                if (field) {
                    if (currentSortField === field) {
                        // Toggle sort order
                        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        // New sort field
                        currentSortField = field;
                        currentSortOrder = 'asc';
                    }
                    
                    // Reset to first page
                    currentPage = 1;
                    
                    // Navigate with new sort settings
                    navigateWithCurrentSettings();
                }
            });
        });
    };
    
    // Apply filters from form inputs
    const applyFilters = () => {
        // Get filter values
        const statusFilter = document.getElementById('status-filter');
        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');
        const industryFilter = document.getElementById('industry-filter');
        
        // Update current filters
        currentFilters = {
            status: statusFilter ? statusFilter.value : 'all',
            dateFrom: dateFrom ? dateFrom.value : '',
            dateTo: dateTo ? dateTo.value : '',
            industry: industryFilter ? industryFilter.value : 'all',
            search: currentFilters.search // Preserve search term
        };
        
        // Reset to first page
        currentPage = 1;
        
        // Navigate with new filters
        navigateWithCurrentSettings();
    };
    
    // Reset all filters
    const resetFilters = () => {
        // Reset filter inputs
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.value = 'all';
        }
        
        const dateFrom = document.getElementById('date-from');
        if (dateFrom) {
            dateFrom.value = '';
        }
        
        const dateTo = document.getElementById('date-to');
        if (dateTo) {
            dateTo.value = '';
        }
        
        const industryFilter = document.getElementById('industry-filter');
        if (industryFilter) {
            industryFilter.value = 'all';
        }
        
        // Global search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Reset current filters
        currentFilters = {
            status: 'all',
            dateFrom: '',
            dateTo: '',
            industry: 'all',
            search: ''
        };
        
        // Reset pagination
        currentPage = 1;
        
        // Reset sorting
        currentSortField = 'notification_date';
        currentSortOrder = 'desc';
        
        // Navigate with reset settings
        navigateWithCurrentSettings();
    };
    
    // Navigate to same page with current filters, pagination and sorting
    const navigateWithCurrentSettings = () => {
        Router.navigate('mergers-list', {
            ...currentFilters,
            page: currentPage,
            sort: `${currentSortField}-${currentSortOrder}`
        });
    };
    
    // Clean up when leaving the page
    const destroy = () => {
        // No cleanup needed for this page
    };
    
    // Export mergers list data
    const exportData = () => {
        if (!allMergers || allMergers.length === 0) {
            App.showNotification('Export Error', 'No data available to export.', 'error');
            return;
        }
        
        // Format data for export
        const exportData = allMergers.map(merger => {
            // Determine current phase
            let currentPhase = 'N/A';
            let expectedCompletion = 'N/A';
            
            if (merger.phase1 && !merger.phase1.actual_end_date) {
                currentPhase = 'Phase 1';
                expectedCompletion = merger.phase1.expected_end_date;
            } else if (merger.phase2 && !merger.phase2.actual_end_date) {
                currentPhase = 'Phase 2';
                expectedCompletion = merger.phase2.expected_end_date;
            } else if (merger.public_benefit && !merger.public_benefit.actual_determination_date) {
                currentPhase = 'Public Benefit';
                expectedCompletion = merger.public_benefit.expected_determination_date;
            } else if (merger.status === 'completed' || merger.status === 'rejected' || merger.status === 'withdrawn') {
                currentPhase = 'Completed';
                
                // Find the most recent end date
                if (merger.public_benefit && merger.public_benefit.actual_determination_date) {
                    expectedCompletion = merger.public_benefit.actual_determination_date;
                } else if (merger.phase2 && merger.phase2.actual_end_date) {
                    expectedCompletion = merger.phase2.actual_end_date;
                } else if (merger.phase1 && merger.phase1.actual_end_date) {
                    expectedCompletion = merger.phase1.actual_end_date;
                }
            }
            
            return {
                ID: merger.merger_id,
                Title: merger.title,
                Acquirer: merger.acquirer.name,
                Target: merger.target.name,
                NotificationDate: merger.notification_date,
                Status: Formatters.formatStatus(merger.status).text,
                CurrentPhase: currentPhase,
                ExpectedCompletion: expectedCompletion,
                Markets: (merger.markets || []).join('; '),
                Description: merger.description
            };
        });
        
        // Generate filename with filters
        let filename = 'mergers_list';
        
        if (currentFilters.status && currentFilters.status !== 'all') {
            filename += `_${currentFilters.status}`;
        }
        
        if (currentFilters.dateFrom) {
            const date = new Date(currentFilters.dateFrom);
            filename += `_from_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        }
        
        if (currentFilters.dateTo) {
            const date = new Date(currentFilters.dateTo);
            filename += `_to_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        }
        
        filename += '.csv';
        
        App.exportToCSV(exportData, filename);
    };
    
    return {
        init,
        destroy,
        exportData
    };
})();
