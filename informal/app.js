// API base URL - update this to your plumber API
const API_BASE_URL = 'https://cardioid.co.nz/mergerapi';

// Global variables
let allMergers = [];
let filteredMergers = [];
let currentPage = 1;
const itemsPerPage = 10;
let industryOptions = new Set();

// DOM elements
const mergersPage = document.getElementById('mergers-page');
const statsPage = document.getElementById('stats-page');
const timelinePage = document.getElementById('timeline-page');
const navLinks = document.querySelectorAll('nav a');
const statusFilter = document.getElementById('status-filter');
const outcomeFilter = document.getElementById('outcome-filter');
const industryFilter = document.getElementById('industry-filter');
const searchInput = document.getElementById('search-input');
const applyFiltersBtn = document.getElementById('apply-filters');
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
    applyFiltersBtn.addEventListener('click', applyFilters);
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
    statsPage.style.display = 'none';
    timelinePage.style.display = 'none';

    if (page === 'mergers') {
        mergersPage.style.display = 'block';
        if (allMergers.length === 0) {
            loadMergers();
        }
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
        
        const response = await fetch(`${API_BASE_URL}/mergers`);
        if (!response.ok) {
            throw new Error('Failed to fetch mergers data');
        }
        
        const data = await response.json();
        allMergers = data;
        filteredMergers = [...allMergers];
        
        // Extract unique industry options for the filter
        allMergers.forEach(merger => {
            if (merger.industry && Array.isArray(merger.industry)) {
                merger.industry.forEach(ind => industryOptions.add(ind));
            }
        });
        
        populateIndustryFilter();
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
        
        const matchesOutcome = !outcomeValue || 
            (merger.outcome && merger.outcome.toLowerCase().includes(outcomeValue));
        
        const matchesIndustry = !industryValue || 
            (merger.industry && Array.isArray(merger.industry) && 
            merger.industry.some(ind => ind === industryValue));
        
        const matchesSearch = !searchValue || 
            (merger.title && merger.title.toLowerCase().includes(searchValue)) ||
            (merger.acquirers && Array.isArray(merger.acquirers) && 
            merger.acquirers.some(acq => acq.toLowerCase().includes(searchValue))) ||
            (merger.targets && Array.isArray(merger.targets) && 
            merger.targets.some(target => target.toLowerCase().includes(searchValue)));
        
        return matchesStatus && matchesOutcome && matchesIndustry && matchesSearch;
    });
    
    currentPage = 1;
    renderMergersTable();
}

// Render mergers table with pagination
function renderMergersTable() {
    // Clear table
    mergersTbody.innerHTML = '';
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredMergers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMergers.length);
    const currentMergers = filteredMergers.slice(startIndex, endIndex);
    
    // Render table rows
    if (currentMergers.length === 0) {
        mergersTbody.innerHTML = '<tr><td colspan="6">No mergers found matching the criteria.</td></tr>';
    } else {
        currentMergers.forEach(merger => {
            const row = document.createElement('tr');
            
            // Format the date
            let formattedDate = '-';
            if (merger.date_completed) {
                formattedDate = new Date(merger.date_completed).toLocaleDateString('en-AU');
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
                } else if (merger.status.toLowerCase().includes('ongoing') || 
                          merger.status.toLowerCase().includes('commenced') ||
                          merger.status.toLowerCase().includes('review')) {
                    statusClass = 'status-ongoing';
                }
            }
            
            let outcomeClass = '';
            if (merger.outcome) {
                if (merger.outcome.toLowerCase().includes('opposed')) {
                    outcomeClass = 'status-opposed';
                } else if (merger.outcome.toLowerCase().includes('not opposed') || 
                          merger.outcome.toLowerCase().includes('cleared')) {
                    outcomeClass = 'status-cleared';
                }
            }
            
            row.innerHTML = `
                <td>${merger.title || '-'}</td>
                <td><span class="status-pill ${statusClass}">${merger.status || '-'}</span></td>
                <td><span class="status-pill ${outcomeClass}">${merger.outcome || '-'}</span></td>
                <td>${formattedDate}</td>
                <td>${industryText}</td>
                <td><button class="view-details" data-id="${merger.id}">View details</button></td>
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
        
        const response = await fetch(`${API_BASE_URL}/merger/${mergerId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch merger details');
        }
        
        let merger = await response.json();

        // Make sure we have valid data
        if (Array.isArray(merger)) {
            merger = merger[0];
        }
        if (!merger || typeof merger !== 'object') {
            throw new Error('Invalid data format returned from API');
        }
        
        // Format details
        let formattedCompletedDate = '-';
        if (merger.outcome_datetime) {
            formattedCompletedDate = new Date(merger.outcome_datetime).toLocaleDateString('en-AU');
        }
        
        let formattedCommencedDate = '-';
        if (merger.commenced_datetime) {
            formattedCommencedDate = new Date(merger.commenced_datetime).toLocaleDateString('en-AU');
        }
        
        // Format acquirers and targets
        let acquirersHtml = '<p>-</p>';
        if (merger.acquirers && Array.isArray(merger.acquirers) && merger.acquirers.length > 0) {
            acquirersHtml = '<ul>' + merger.acquirers.map(a => `<li>${a}</li>`).join('') + '</ul>';
        }
        
        let targetsHtml = '<p>-</p>';
        if (merger.targets && Array.isArray(merger.targets) && merger.targets.length > 0) {
            targetsHtml = '<ul>' + merger.targets.map(t => `<li>${t}</li>`).join('') + '</ul>';
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
        modalContent.innerHTML = `
            <div class="merger-details">
                <h3>Status & Outcome</h3>
                <p><strong>Status:</strong> ${merger.status || '-'}</p>
                <p><strong>Outcome:</strong> ${merger.outcome || '-'}</p>
                <p><strong>Date commenced:</strong> ${formattedCommencedDate}</p>
                <p><strong>Date completed:</strong> ${formattedCompletedDate}</p>
                <p><strong>Review duration:</strong> ${merger.review_days || '-'} days</p>
                
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

// Load statistics data
async function loadStats() {
    try {
        document.getElementById('total-mergers').textContent = 'Loading...';
        document.getElementById('avg-review-days').textContent = 'Loading...';
        document.getElementById('ongoing-mergers').textContent = 'Loading...';
        
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (!response.ok) {
            throw new Error('Failed to fetch statistics');
        }
        
        const stats = await response.json();
        
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
        
        const response = await fetch(`${API_BASE_URL}/commencements/${period}`);
        if (!response.ok) {
            throw new Error('Failed to fetch timeline data');
        }
        
        const timelineData = await response.json();
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
        const response = await fetch(`${API_BASE_URL}/rolling_averages`);
        if (!response.ok) {
            throw new Error('Failed to fetch rolling averages');
        }
        
        const rollingData = await response.json();
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
