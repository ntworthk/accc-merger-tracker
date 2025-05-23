// API base URL - update this to your plumber API
const API_BASE_URL = 'https://cardioid.co.nz/mergerapi';

// Utility function for cached fetch operations
async function cachedFetch(url, forceRefresh = false) {
    try {
        const options = {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };
        
        // Set the cache strategy based on whether we want to force refresh
        if (forceRefresh) {
            options.cache = 'reload'; // Bypasses cache for fresh data
        } else {
            options.cache = 'force-cache'; // Prioritizes cached data
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        throw error; // Re-throw to allow proper error handling by caller
    }
}


// Global variables
let allMergers = [];
let filteredMergers = [];
let currentPage = 1;
const itemsPerPage = 10;
let industryOptions = new Set();
let currentSortColumn = 'commenced_datetime';
let currentSortDirection = 'desc';
let allUpcomingEvents = [];
let filteredUpcomingEvents = [];
let upcomingCurrentPage = 1;
const upcomingItemsPerPage = 10;

// DOM elements
const mergersPage = document.getElementById('mergers-page');
const upcomingPage = document.getElementById('upcoming-page');
const statsPage = document.getElementById('stats-page');
const timelinePage = document.getElementById('timeline-page');
const navLinks = document.querySelectorAll('nav a');
const statusFilter = document.getElementById('status-filter');
const outcomeFilter = document.getElementById('outcome-filter');
const industryFilter = document.getElementById('industry-filter');
const searchInput = document.getElementById('search-input');
const periodFilter = document.getElementById('period-filter');
const applyTimelineFiltersBtn = document.getElementById('apply-timeline-filters');
const mergersTbody = document.getElementById('mergers-tbody');
const loadingElement = document.getElementById('loader');
const mergersTable = document.getElementById('mergers-table');
const paginationElement = document.getElementById('pagination');
const modal = document.getElementById('merger-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const closeModal = document.getElementsByClassName('close')[0];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
            
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Set up filters
    applyTimelineFiltersBtn.addEventListener('click', loadTimelineData);
    
    // Set up modal
    closeModal.onclick = function() {
        modal.style.display = "none";
    };
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    // Load initial data
    loadMergers();
});

// Show the selected page
function showPage(page) {
    mergersPage.style.display = 'none';
    upcomingPage.style.display = 'none';
    statsPage.style.display = 'none';
    timelinePage.style.display = 'none';

    if (page === 'mergers') {
        mergersPage.style.display = 'block';
        if (allMergers.length === 0) {
            loadMergers();
        }
    } else if (page === 'upcoming') {
        upcomingPage.style.display = 'block';
        loadUpcomingEvents();
    } else if (page === 'stats') {
        statsPage.style.display = 'block';
        loadStats();
    } else if (page === 'timeline') {
        timelinePage.style.display = 'block';
        loadTimelineData();
    }
}

// Fetch mergers data
async function loadMergers() {
    try {
        loadingElement.style.display = 'block';
        mergersTable.style.display = 'none';
        
        const data = await cachedFetch(`${API_BASE_URL}/mergers`);
        allMergers = data;
        filteredMergers = [...allMergers];
        
        // Extract unique industry options for the filter
        allMergers.forEach(merger => {
            if (merger.industry && Array.isArray(merger.industry)) {
                merger.industry.forEach(ind => industryOptions.add(ind));
            }
        });
        
        populateIndustryFilter();

        setupSortableHeaders();

        setupLiveFiltering();

        // Initial sort by commenced_datetime desc
        currentSortColumn = 'commenced_datetime';
        currentSortDirection = 'desc';
        
        renderMergersTable();
        loadingElement.style.display = 'none';
        mergersTable.style.display = 'table';
    } catch (error) {
        console.error('Error loading mergers:', error);
        loadingElement.innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
}

// Populate industry filter dropdown
function populateIndustryFilter() {
    const industries = Array.from(industryOptions).sort();
    industryFilter.innerHTML = '<option value="">All industries</option>';
    
    industries.forEach(industry => {
        const option = document.createElement('option');
        option.value = industry;
        option.textContent = industry;
        industryFilter.appendChild(option);
    });
}

// Apply filters to the mergers data
function applyFilters() {
    const statusValue = statusFilter.value.toLowerCase();
    const outcomeValue = outcomeFilter.value.toLowerCase();
    const industryValue = industryFilter.value;
    const searchValue = searchInput.value.toLowerCase();
    
    filteredMergers = allMergers.filter(merger => {
        const matchesStatus = !statusValue || 
            (merger.status && merger.status.toLowerCase().includes(statusValue));
        
        // More precise outcome matching
        let matchesOutcome = true;
        if (outcomeValue) {
            if (outcomeValue === 'opposed') {
                // Exact match for "Opposed" that excludes "Not opposed"
                matchesOutcome = merger.outcome && 
                    (merger.outcome.toLowerCase() === 'opposed' || 
                     merger.outcome.toLowerCase().startsWith('opposed '));
            } else if (outcomeValue === 'not opposed') {
                // Match for outcomes beginning with "Not opposed"
                matchesOutcome = merger.outcome && 
                    merger.outcome.toLowerCase().startsWith('not opposed');
            } else {
                // Default case for other outcomes
                matchesOutcome = merger.outcome && 
                    merger.outcome.toLowerCase().includes(outcomeValue);
            }
        }
        
        const matchesIndustry = !industryValue || 
            (merger.industry && Array.isArray(merger.industry) && 
            merger.industry.some(ind => ind === industryValue));
        
        const matchesSearch = !searchValue || 
            (merger.title && merger.title.toLowerCase().includes(searchValue)) ||
            (merger.acquirers && Array.isArray(merger.acquirers) && 
            merger.acquirers.some(acq => acq.toLowerCase().includes(searchValue))) ||
            (merger.targets && Array.isArray(merger.targets) && 
            merger.targets.some(target => target.toLowerCase().includes(searchValue))) ||
            (merger.industry && Array.isArray(merger.industry) && 
            merger.industry.some(ind => ind.toLowerCase().includes(searchValue)));
        
        return matchesStatus && matchesOutcome && matchesIndustry && matchesSearch;
    });
    
    currentPage = 1;
    renderMergersTable();
}

// Render mergers table with pagination
function renderMergersTable() {
    // Sort the data before rendering
    sortMergers();
    
    // Clear table
    mergersTbody.innerHTML = '';
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredMergers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMergers.length);
    const currentMergers = filteredMergers.slice(startIndex, endIndex);
    
    // Render table rows
    if (currentMergers.length === 0) {
        mergersTbody.innerHTML = '<tr><td colspan="7">No mergers found matching the criteria.</td></tr>';
    } else {
        currentMergers.forEach(merger => {
            const row = document.createElement('tr');
            
            // Format the commenced date
            let formattedCommencedDate = '-';
            if (merger.commenced_datetime) {
                formattedCommencedDate = new Date(merger.commenced_datetime).toLocaleDateString('en-AU');
            }
            
            // Format the completed date - blank for ongoing mergers
            let formattedCompletedDate = '-';
            const isOngoing = merger.status && merger.status.toLowerCase().includes('under consideration');
            
            if (!isOngoing && merger.outcome_datetime) {
                formattedCompletedDate = new Date(merger.outcome_datetime).toLocaleDateString('en-AU');
            } else if (isOngoing) {
                formattedCompletedDate = '';
            }
            
            // Format the industries
            let industryText = '-';
            if (merger.industry && Array.isArray(merger.industry) && merger.industry.length > 0) {
                industryText = merger.industry.join(', ');
            }
            
            // Create status pill
            let statusClass = '';
            if (merger.status) {
                if (merger.status.toLowerCase().includes('completed')) {
                    statusClass = 'status-completed';
                } else if (merger.status.toLowerCase().includes('under consideration')) {
                    statusClass = 'status-ongoing';
                }
            }
            
            // Display outcome - blank for ongoing mergers
            let outcome = merger.outcome || '-';
            let outcomeClass = '';
            
            if (isOngoing) {
                outcome = '';
                outcomeClass = '';
            } else if (merger.outcome) {
                if (merger.outcome.toLowerCase().includes('not opposed subject to undertakings')) {
                    outcomeClass = 'status-partial-cleared';
                } else if (merger.outcome.toLowerCase().includes('not opposed')) {
                    outcomeClass = 'status-cleared';
                } else if (merger.outcome.toLowerCase().includes('opposed')) {
                    outcomeClass = 'status-opposed';
                } else if (merger.outcome.toLowerCase().includes('withdrawn') ||
                          merger.outcome.toLowerCase().includes('no decision')) {
                    outcomeClass = 'status-withdrawn';
                }
            }
            
            row.innerHTML = `
                <td>${merger.title || '-'}</td>
                <td><span class="status-pill ${statusClass}">${merger.status || '-'}</span></td>
                <td><span class="status-pill ${outcomeClass}">${outcome}</span></td>
                <td>${formattedCommencedDate}</td>
                <td>${formattedCompletedDate}</td>
                <td>${industryText}</td>
                <td>
                    <button class="view-details" data-id="${merger.id}">View details</button>
                    <a href="https://accc.gov.au/${merger.link}" target="_blank" class="accc-link">ACCC page</a>
                </td>
            `;
            
            mergersTbody.appendChild(row);
        });
        
        // Set up view details buttons
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function() {
                const mergerId = this.getAttribute('data-id');
                viewMergerDetails(mergerId);
            });
        });
    }
    
    // Render pagination
    renderPagination(totalPages);
    
    // Update the sort indicators
    updateSortIndicators();
}

// Sort mergers according to current sort settings
function sortMergers() {
    filteredMergers.sort((a, b) => {
        let valueA, valueB;
        
        // Get values for sorting according to column
        if (currentSortColumn === 'title') {
            valueA = a.title || '';
            valueB = b.title || '';
            
            // For strings, use localeCompare
            return currentSortDirection === 'asc' 
                ? valueA.localeCompare(valueB) 
                : valueB.localeCompare(valueA);
        } 
        else if (currentSortColumn === 'status') {
            valueA = a.status || '';
            valueB = b.status || '';
            
            return currentSortDirection === 'asc' 
                ? valueA.localeCompare(valueB) 
                : valueB.localeCompare(valueA);
        } 
        else if (currentSortColumn === 'outcome') {
            valueA = a.outcome || '';
            valueB = b.outcome || '';
            
            return currentSortDirection === 'asc' 
                ? valueA.localeCompare(valueB) 
                : valueB.localeCompare(valueA);
        } 
        else if (currentSortColumn === 'commenced_datetime') {
            valueA = a.commenced_datetime ? new Date(a.commenced_datetime).getTime() : 0;
            valueB = b.commenced_datetime ? new Date(b.commenced_datetime).getTime() : 0;
            
            return currentSortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        } 
        else if (currentSortColumn === 'outcome_datetime') {
            // Improved outcome_datetime handling with better date parsing
            
            // Function to get date value from either outcome_datetime or date_completed
            const getDateValue = (merger) => {
                if (merger.outcome_datetime && merger.outcome_datetime !== 'NA') {
                    return new Date(merger.outcome_datetime).getTime();
                } else if (merger.date_completed && merger.date_completed !== 'NA') {
                    // Parse date_completed which may be in a different format
                    try {
                        // Australian date format parsing DD Month YYYY
                        const dateStr = merger.date_completed;
                        return new Date(dateStr).getTime();
                    } catch (e) {
                        return 0;
                    }
                }
                return 0;
            };
            
            const dateValueA = getDateValue(a);
            const dateValueB = getDateValue(b);
            
            // Check if both have valid date values
            const hasDateA = dateValueA > 0;
            const hasDateB = dateValueB > 0;
            
            // If sorting ascending
            if (currentSortDirection === 'asc') {
                // If both have dates, compare them normally
                if (hasDateA && hasDateB) {
                    return dateValueA - dateValueB;
                }
                // Items without dates should appear first when ascending
                return hasDateA ? 1 : (hasDateB ? -1 : 0);
            } else {
                // If sorting descending
                // If both have dates, compare them normally
                if (hasDateA && hasDateB) {
                    return dateValueB - dateValueA;
                }
                // Items without dates should appear last when descending
                return hasDateA ? -1 : (hasDateB ? 1 : 0);
            }
        } 
        else if (currentSortColumn === 'industry') {
            // For industry, use the first industry if there are multiple
            valueA = (a.industry && a.industry.length > 0) ? a.industry[0] : '';
            valueB = (b.industry && b.industry.length > 0) ? b.industry[0] : '';
            
            return currentSortDirection === 'asc' 
                ? valueA.localeCompare(valueB) 
                : valueB.localeCompare(valueA);
        }
        
        // Default sorting
        return 0;
    });
}

// Function to update sort indicators in the table headers
function updateSortIndicators() {
    // Remove all sort indicators first
    document.querySelectorAll('th .sort-indicator').forEach(el => el.remove());
    
    // Map the column index to the data property
    const columnMapping = {
        0: 'title',
        1: 'status',
        2: 'outcome',
        3: 'commenced_datetime',
        4: 'outcome_datetime',
        5: 'industry'
    };
    
    // Find the header that matches the current sort column
    document.querySelectorAll('#mergers-table th').forEach((th, index) => {
        if (index < 6) { // Skip the Actions column
            const dataColumn = columnMapping[index];
            
            if (dataColumn === currentSortColumn) {
                // Create and append the sort indicator
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator';
                indicator.innerHTML = currentSortDirection === 'asc' ? ' ▲' : ' ▼';
                th.appendChild(indicator);
            }
        }
    });
}

// Function to set up sortable headers
function setupSortableHeaders() {
    // Map the index to the data property
    const columnMapping = {
        0: 'title',
        1: 'status',
        2: 'outcome',
        3: 'commenced_datetime',
        4: 'outcome_datetime',
        5: 'industry'
    };
    
    document.querySelectorAll('#mergers-table th').forEach((th, index) => {
        if (index < 6) { // Skip the Actions column
            th.style.cursor = 'pointer';
            
            // Add a click event listener
            th.addEventListener('click', function() {
                const dataColumn = columnMapping[index];
                
                // If clicking the same column, toggle direction
                if (currentSortColumn === dataColumn) {
                    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    // New column, set it as the current sort column and reset direction
                    currentSortColumn = dataColumn;
                    currentSortDirection = 'asc';
                }
                
                // Re-render the table with the new sort settings
                renderMergersTable();
            });
        }
    });
}

// Function to apply filters immediately
function setupLiveFiltering() {
    
    // Set up event listeners for all filter inputs
    statusFilter.addEventListener('change', applyFilters);
    outcomeFilter.addEventListener('change', applyFilters);
    industryFilter.addEventListener('change', applyFilters);
    
    // For the search input, use input event with debounce
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300); // 300ms debounce
    });
}

// Render pagination controls
function renderPagination(totalPages) {
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    const prevLi = document.createElement('li');
    const prevButton = document.createElement('button');
    prevButton.textContent = '←';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderMergersTable();
        }
    });
    prevLi.appendChild(prevButton);
    paginationElement.appendChild(prevLi);
    
    // Page buttons
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            renderMergersTable();
        });
        pageLi.appendChild(pageButton);
        paginationElement.appendChild(pageLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    const nextButton = document.createElement('button');
    nextButton.textContent = '→';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderMergersTable();
        }
    });
    nextLi.appendChild(nextButton);
    paginationElement.appendChild(nextLi);
}

// View details of a specific merger
async function viewMergerDetails(mergerId) {
    try {
        modalTitle.textContent = 'Loading...';
        modalContent.innerHTML = '<div class="loader-spinner"></div>';
        modal.style.display = 'block';
        
        let merger = await cachedFetch(`${API_BASE_URL}/merger/${mergerId}`);

        // Make sure we have valid data
        if (Array.isArray(merger)) {
            merger = merger[0];
        }
        if (!merger || typeof merger !== 'object') {
            throw new Error('Invalid data format returned from API');
        }
        
        // Check if merger is ongoing
        const isOngoing = merger.status && 
            merger.status.toLowerCase().includes('under consideration');
        
        // Format details
        let formattedCommencedDate = '-';
        if (merger.commenced_datetime) {
            formattedCommencedDate = new Date(merger.commenced_datetime).toLocaleDateString('en-AU');
        }
        
        // Format acquirers - handle both string and array formats
        let acquirersHtml = '<p>-</p>';
        if (merger.acquirers) {
            if (Array.isArray(merger.acquirers) && merger.acquirers.length > 0) {
                acquirersHtml = '<ul>' + merger.acquirers.map(a => `<li>${a}</li>`).join('') + '</ul>';
            } else if (typeof merger.acquirers === 'string' && merger.acquirers.trim() !== '') {
                acquirersHtml = `<p>${merger.acquirers}</p>`;
            }
        }
        
        // Format targets - handle both string and array formats
        let targetsHtml = '<p>-</p>';
        if (merger.targets) {
            if (Array.isArray(merger.targets) && merger.targets.length > 0) {
                targetsHtml = '<ul>' + merger.targets.map(t => `<li>${t}</li>`).join('') + '</ul>';
            } else if (typeof merger.targets === 'string' && merger.targets.trim() !== '') {
                targetsHtml = `<p>${merger.targets}</p>`;
            }
        }
        
        // Format timeline
        let timelineHtml = '<p>No timeline data available</p>';
        if (merger.timeline && Array.isArray(merger.timeline) && merger.timeline.length > 0) {
            timelineHtml = '<table><thead><tr><th>Date</th><th>Event</th></tr></thead><tbody>';
            merger.timeline.forEach(event => {
                let eventDate = '-';
                if (event.time) {
                    eventDate = new Date(event.time).toLocaleDateString('en-AU');
                }
                timelineHtml += `<tr><td>${eventDate}</td><td>${event.Event || event.Description || '-'}</td></tr>`;
            });
            timelineHtml += '</tbody></table>';
        }
        
        modalTitle.textContent = merger.title || 'Merger Details';
        
        // Create different HTML for ongoing vs completed mergers
        let statusHtml = '';
        if (isOngoing) {
            // For ongoing mergers, only show status and commenced date
            statusHtml = `
                <h3>Status</h3>
                <p><strong>Status:</strong> ${merger.status || '-'}</p>
                <p><strong>Date commenced:</strong> ${formattedCommencedDate}</p>
            `;
        } else {
            // For completed mergers, show all fields
            let formattedCompletedDate = '-';
            if (merger.outcome_datetime) {
                formattedCompletedDate = new Date(merger.outcome_datetime).toLocaleDateString('en-AU');
            }
            
            statusHtml = `
                <h3>Status & Outcome</h3>
                <p><strong>Status:</strong> ${merger.status || '-'}</p>
                <p><strong>Outcome:</strong> ${merger.outcome || '-'}</p>
                <p><strong>Date commenced:</strong> ${formattedCommencedDate}</p>
                <p><strong>Date completed:</strong> ${formattedCompletedDate}</p>
                <p><strong>Review duration:</strong> ${merger.review_days || '-'} days</p>
            `;
        }
        
        modalContent.innerHTML = `
            <div class="merger-details">
                ${statusHtml}
                
                <h3>Industry</h3>
                <p>${Array.isArray(merger.industry) ? merger.industry.join(', ') : (merger.industry || '-')}</p>
                
                <h3>Participants</h3>
                <div class="participants">
                    <div>
                        <h4>Acquirers:</h4>
                        ${acquirersHtml}
                    </div>
                    <div>
                        <h4>Targets:</h4>
                        ${targetsHtml}
                    </div>
                </div>
                
                <h3>Timeline</h3>
                <div class="timeline">
                    ${timelineHtml}
                </div>
                
                <p class="last-updated"><small>Last updated: ${new Date(merger.last_updated).toLocaleString('en-AU')}</small></p>
            </div>
        `;
    } catch (error) {
        console.error('Error loading merger details:', error);
        modalContent.innerHTML = `<p>Error loading details: ${error.message}</p>`;
    }
}

// Load upcoming events data
async function loadUpcomingEvents() {
    try {
        document.getElementById('upcoming-loader').style.display = 'block';
        document.getElementById('upcoming-table').style.display = 'none';
        
        const data = await cachedFetch(`${API_BASE_URL}/upcoming_events`);
        allUpcomingEvents = data;
        filteredUpcomingEvents = [...allUpcomingEvents];
        
        renderUpcomingEventsTable();
        document.getElementById('upcoming-loader').style.display = 'none';
        document.getElementById('upcoming-table').style.display = 'table';
    } catch (error) {
        console.error('Error loading upcoming events:', error);
        document.getElementById('upcoming-loader').innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
}

function renderUpcomingEventsTable() {
    const tbody = document.getElementById('upcoming-tbody');
    tbody.innerHTML = '';
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredUpcomingEvents.length / upcomingItemsPerPage);
    const startIndex = (upcomingCurrentPage - 1) * upcomingItemsPerPage;
    const endIndex = Math.min(startIndex + upcomingItemsPerPage, filteredUpcomingEvents.length);
    const currentEvents = filteredUpcomingEvents.slice(startIndex, endIndex);
    
    // Render table rows
    if (currentEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No upcoming events found.</td></tr>';
    } else {
        currentEvents.forEach(event => {
            const row = document.createElement('tr');
            
            // Format the event date
            let formattedEventDate = '-';
            if (event.event_date) {
                formattedEventDate = new Date(event.event_date).toLocaleDateString('en-AU');
            }
            
            // Get the event description (check multiple possible column names)
            let eventDescription = event.Event || event.Description || '-';
            
            row.innerHTML = `
                <td>${event.merger_title || '-'}</td>
                <td>${formattedEventDate}</td>
                <td>${eventDescription}</td>
                <td>
                    <button class="view-details" data-id="${event.merger_id}">View details</button>
                    <a href="https://accc.gov.au/${event.merger_link}" target="_blank" class="accc-link">ACCC page</a>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Set up view details buttons
        document.querySelectorAll('#upcoming-tbody .view-details').forEach(button => {
            button.addEventListener('click', function() {
                const mergerId = this.getAttribute('data-id');
                viewMergerDetails(mergerId);
            });
        });
    }
    
    // Render pagination
    renderUpcomingPagination(totalPages);
}

function renderUpcomingPagination(totalPages) {
    const paginationElement = document.getElementById('upcoming-pagination');
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    const prevLi = document.createElement('li');
    const prevButton = document.createElement('button');
    prevButton.textContent = '←';
    prevButton.disabled = upcomingCurrentPage === 1;
    prevButton.addEventListener('click', () => {
        if (upcomingCurrentPage > 1) {
            upcomingCurrentPage--;
            renderUpcomingEventsTable();
        }
    });
    prevLi.appendChild(prevButton);
    paginationElement.appendChild(prevLi);
    
    // Page buttons
    const maxButtons = 5;
    let startPage = Math.max(1, upcomingCurrentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        if (i === upcomingCurrentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            upcomingCurrentPage = i;
            renderUpcomingEventsTable();
        });
        pageLi.appendChild(pageButton);
        paginationElement.appendChild(pageLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    const nextButton = document.createElement('button');
    nextButton.textContent = '→';
    nextButton.disabled = upcomingCurrentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (upcomingCurrentPage < totalPages) {
            upcomingCurrentPage++;
            renderUpcomingEventsTable();
        }
    });
    nextLi.appendChild(nextButton);
    paginationElement.appendChild(nextLi);
}

// Load statistics data
async function loadStats() {
    try {
        document.getElementById('total-mergers').textContent = 'Loading...';
        document.getElementById('avg-review-days').textContent = 'Loading...';
        document.getElementById('ongoing-mergers').textContent = 'Loading...';
        
        const stats = await cachedFetch(`${API_BASE_URL}/stats`);
        
        // Update dashboard cards - handle array values correctly
        document.getElementById('total-mergers').textContent = 
            Array.isArray(stats.total_mergers) ? stats.total_mergers[0] : (stats.total_mergers || 0);
            
        document.getElementById('avg-review-days').textContent = 
            Array.isArray(stats.avg_review_days) ? 
                stats.avg_review_days[0].toFixed(1) : 
                (stats.avg_review_days ? stats.avg_review_days.toFixed(1) : '-');
                
        document.getElementById('ongoing-mergers').textContent = 
            Array.isArray(stats.ongoing_mergers) ? stats.ongoing_mergers[0] : (stats.ongoing_mergers || 0);
        
        // Render outcome chart
        if (stats.outcomes) {
            renderOutcomesChart(stats.outcomes);
        }
        
        // Render industries chart
        if (stats.industries) {
            renderIndustriesChart(stats.industries);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        document.getElementById('total-mergers').textContent = 'Error';
        document.getElementById('avg-review-days').textContent = 'Error';
        document.getElementById('ongoing-mergers').textContent = 'Error';
    }
}

// Update the renderOutcomesChart function
function renderOutcomesChart(outcomes) {
    const ctx = document.getElementById('outcomes-chart').getContext('2d');
    
    // If there's an existing chart, destroy it
    if (window.outcomesChart) {
        window.outcomesChart.destroy();
    }
    
    // Function to wrap text at about 20 characters
    function wrapLabel(label) {
        if (!label) return '';
        // Break at word boundaries if possible
        const maxChars = 20;
        if (label.length <= maxChars) return label;
        
        // Split into chunks of ~20 chars at word boundaries
        let result = [];
        let currentLine = '';
        label.split(' ').forEach(word => {
            if (currentLine.length + word.length + 1 <= maxChars) {
                currentLine += (currentLine.length ? ' ' : '') + word;
            } else {
                if (currentLine.length) result.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine.length) result.push(currentLine);
        return result.join('\n');
    }
    
    const labels = outcomes.map(item => wrapLabel(item.outcome));
    const data = outcomes.map(item => item.count);
    const colors = outcomes.map(item => {
        if (item.outcome.toLowerCase().includes('not opposed') || 
           item.outcome.toLowerCase().includes('cleared')) {
            return '#17a2b8';
        } else if (item.outcome.toLowerCase().includes('opposed')) {
            return '#dc3545';
        } else {
            return '#ffc107';
        }
    });
    
    window.outcomesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of mergers',
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 20 // Add extra padding at the bottom
                }
            },
            scales: {
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0, // Keep labels horizontal
                        minRotation: 0  // Keep labels horizontal
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        // Show the original, unwrapped text in tooltips
                        title: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            return outcomes[index].outcome;
                        }
                    }
                }
            }
        }
    });
}

// Update the renderIndustriesChart function
function renderIndustriesChart(industries) {
    const ctx = document.getElementById('industries-chart').getContext('2d');
    
    // Add the industries-chart class to the container
    document.getElementById('industries-chart').closest('.chart-container').classList.add('industries-chart');
    
    // If there's an existing chart, destroy it
    if (window.industriesChart) {
        window.industriesChart.destroy();
    }
    
    const topIndustries = industries.slice(0, 10);
    const labels = topIndustries.map(item => item.industry);
    const data = topIndustries.map(item => item.count);
    
    window.industriesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of mergers',
                data: data,
                backgroundColor: '#0085b6',
                borderColor: '#006286',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            layout: {
                padding: {
                    bottom: 20
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                },
                y: {
                    ticks: {
                        autoSkip: false,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Load timeline data
async function loadTimelineData() {
    try {
        const period = periodFilter.value;
        
        const timelineData = await cachedFetch(`${API_BASE_URL}/commencements/${period}`);
        renderTimelineChart(timelineData, period);
        
        // Load rolling averages for daily data
        if (period === 'day') {
            loadRollingAverages();
        } else {
            document.getElementById('rolling-chart').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading timeline data:', error);
    }
}

// Update the renderTimelineChart function
function renderTimelineChart(timelineData, period) {
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    // If there's an existing chart, destroy it
    if (window.timelineChart) {
        window.timelineChart.destroy();
    }
    
    // Format dates based on period
    const labels = timelineData.map(item => {
        const date = new Date(item.period_start);
        if (period === 'year') {
            return date.getFullYear().toString();
        } else if (period === 'month') {
            return `${date.toLocaleString('en-AU', { month: 'short' })} ${date.getFullYear()}`;
        } else {
            return date.toLocaleDateString('en-AU');
        }
    });
    
    const data = timelineData.map(item => item.count);
    
    window.timelineChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of mergers',
                data: data,
                backgroundColor: '#0085b6',
                borderColor: '#006286',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 20
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        }
                    }
                }
            }
        }
    });
}

// Load rolling averages data
async function loadRollingAverages() {
    try {
        const rollingData = await cachedFetch(`${API_BASE_URL}/rolling_averages`);
        renderRollingChart(rollingData);
        document.getElementById('rolling-chart').style.display = 'block';
    } catch (error) {
        console.error('Error loading rolling averages:', error);
    }
}

// Update the renderRollingChart function
function renderRollingChart(rollingData) {
    const ctx = document.getElementById('rolling-chart').getContext('2d');
    
    // If there's an existing chart, destroy it
    if (window.rollingChart) {
        window.rollingChart.destroy();
    }
    
    // Format dates
    const labels = rollingData.map(item => new Date(item.date).toLocaleDateString('en-AU'));
    
    window.rollingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '30-day rolling',
                    data: rollingData.map(item => item.rolling_30d),
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: '90-day rolling',
                    data: rollingData.map(item => item.rolling_90d),
                    borderColor: '#0085b6',
                    backgroundColor: 'rgba(0, 133, 182, 0.1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: '365-day rolling',
                    data: rollingData.map(item => item.rolling_365d),
                    borderColor: '#006286',
                    backgroundColor: 'rgba(0, 98, 134, 0.1)',
                    borderWidth: 2,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 20
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .sort-indicator {
            margin-left: 5px;
            display: inline-block;
        }
        
        #mergers-table th {
            position: relative;
            user-select: none;
        }
        
        #mergers-table th:hover {
            background-color: var(--secondary-color);
        }
    `;
    document.head.appendChild(style);
});

