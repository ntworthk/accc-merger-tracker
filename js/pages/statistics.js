/**
 * statistics.js - Statistics page controller for the Merger Tracker application
 * Displays analytical visualizations of merger review data
 */

const Statistics = (() => {
    // References to charts for cleanup
    let outcomesChart = null;
    let durationChart = null;
    let reviewsTimeChart = null;
    let phaseProgressionChart = null;
    let industryChart = null;
    let extensionsChart = null;
    
    // Current filter dates
    let filterDateFrom = '';
    let filterDateTo = '';
    
    // Initialize the statistics page
    const init = async (params = {}) => {
        try {
            // Set filters from URL params
            filterDateFrom = params.dateFrom || '';
            filterDateTo = params.dateTo || '';
            
            // Apply filters to form elements
            applyFiltersToForm();
            
            // Load and render charts
            await loadCharts();
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing statistics:', error);
            App.showNotification('Error', 'Failed to load statistics data.', 'error');
        }
    };
    
    // Apply current filters to form elements
    const applyFiltersToForm = () => {
        const dateFrom = document.getElementById('stats-date-from');
        if (dateFrom) {
            dateFrom.value = filterDateFrom;
        }
        
        const dateTo = document.getElementById('stats-date-to');
        if (dateTo) {
            dateTo.value = filterDateTo;
        }
    };
    
    // Load all charts
    const loadCharts = async () => {
        try {
            // Load data
            const [outcomes, duration, industries] = await Promise.all([
                API.getStatisticsOutcomes(),
                API.getStatisticsDuration(),
                API.getStatisticsByIndustry()
            ]);
            
            // Render charts
            renderOutcomesChart(outcomes);
            renderDurationChart(duration);
            renderReviewsTimeChart();
            renderPhaseProgressionChart();
            renderIndustryChart(industries);
            renderExtensionsChart();
            
        } catch (error) {
            console.error('Error loading chart data:', error);
            App.showNotification('Error', 'Failed to load some statistics data.', 'error');
        }
    };
    
    // Render the review outcomes chart
    const renderOutcomesChart = (outcomes) => {
        const chartContainer = document.getElementById('outcomes-chart');
        
        // Clear previous chart if exists
        if (outcomesChart) {
            outcomesChart.destroy();
        }
        
        // Clear the container
        chartContainer.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Prepare data
        const data = {
            labels: ['Cleared', 'Cleared with Conditions', 'Rejected', 'Withdrawn', 'Pending'],
            datasets: [{
                data: [
                    outcomes.cleared,
                    outcomes.cleared_with_conditions,
                    outcomes.rejected,
                    outcomes.withdrawn,
                    outcomes.pending
                ],
                backgroundColor: [
                    '#28a745',  // Cleared
                    '#ffc107',  // Conditions
                    '#dc3545',  // Rejected
                    '#6c757d',  // Withdrawn
                    '#007bff'   // Pending
                ],
                borderWidth: 0
            }]
        };
        
        // Chart options
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        };
        
        // Create chart
        outcomesChart = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: options
        });
    };
    
    // Render the average duration chart
    const renderDurationChart = (duration) => {
        const chartContainer = document.getElementById('stats-duration-chart');
        
        // Clear previous chart if exists
        if (durationChart) {
            durationChart.destroy();
        }
        
        // Clear the container
        chartContainer.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Calculate statutory limits
        const phase1Statutory = 30;
        const phase2Statutory = 90;
        const publicBenefitStatutory = 50;
        
        // Prepare data
        const data = {
            labels: ['Phase 1', 'Phase 2', 'Public Benefit'],
            datasets: [
                {
                    label: 'Average Days',
                    data: [
                        duration.average_phase1_days,
                        duration.average_phase2_days,
                        duration.average_public_benefit_days
                    ],
                    backgroundColor: [
                        'rgba(0, 123, 255, 0.7)',
                        'rgba(253, 126, 20, 0.7)',
                        'rgba(111, 66, 193, 0.7)'
                    ],
                    borderColor: [
                        'rgba(0, 123, 255, 1)',
                        'rgba(253, 126, 20, 1)',
                        'rgba(111, 66, 193, 1)'
                    ],
                    borderWidth: 1
                },
                {
                    label: 'Statutory Limit',
                    data: [
                        phase1Statutory,
                        phase2Statutory,
                        publicBenefitStatutory
                    ],
                    type: 'line',
                    fill: false,
                    backgroundColor: 'rgba(220, 53, 69, 0.5)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointStyle: 'line'
                }
            ]
        };
        
        // Chart options
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Business Days'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value} business days`;
                        }
                    }
                }
            }
        };
        
        // Create chart
        durationChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: options
        });
    };
    
    // Render the reviews over time chart
    const renderReviewsTimeChart = () => {
        const chartContainer = document.getElementById('reviews-time-chart');
        
        // Clear previous chart if exists
        if (reviewsTimeChart) {
            reviewsTimeChart.destroy();
        }
        
        // Clear the container
        chartContainer.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Generate some dummy data for demonstration
        // In a real implementation, this would come from the API
        
        // Get last 12 months
        const labels = [];
        const data = {
            notifications: [],
            phase1: [],
            phase2: [],
            completed: []
        };
        
        const today = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = month.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
            labels.push(monthName);
            
            // Generate random data for demonstration
            data.notifications.push(Math.floor(Math.random() * 5) + 1);
            data.phase1.push(Math.floor(Math.random() * 4) + 1);
            data.phase2.push(Math.floor(Math.random() * 3));
            data.completed.push(Math.floor(Math.random() * 3));
        }
        
        // Prepare chart data
        const chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Notifications',
                    data: data.notifications,
                    backgroundColor: 'rgba(108, 117, 125, 0.2)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 2,
                    tension: 0.3
                },
                {
                    label: 'Phase 1 Reviews',
                    data: data.phase1,
                    backgroundColor: 'rgba(0, 123, 255, 0.2)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 2,
                    tension: 0.3
                },
                {
                    label: 'Phase 2 Reviews',
                    data: data.phase2,
                    backgroundColor: 'rgba(253, 126, 20, 0.2)',
                    borderColor: 'rgba(253, 126, 20, 1)',
                    borderWidth: 2,
                    tension: 0.3
                },
                {
                    label: 'Completed Reviews',
                    data: data.completed,
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    tension: 0.3
                }
            ]
        };
        
        // Chart options
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Reviews'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        };
        
        // Create chart
        reviewsTimeChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: options
        });
    };
    
    // Render the phase progression chart
    const renderPhaseProgressionChart = () => {
        const chartContainer = document.getElementById('phase-progression-chart');
        
        // Clear previous chart if exists
        if (phaseProgressionChart) {
            phaseProgressionChart.destroy();
        }
        
        // Clear the container
        chartContainer.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Generate dummy data for demonstration
        const data = {
            phase1_to_cleared: 60,
            phase1_to_conditions: 20,
            phase1_to_phase2: 20,
            phase2_to_cleared: 50,
            phase2_to_conditions: 30,
            phase2_to_rejected: 20,
            phase2_to_public_benefit: 0,
            rejected_to_public_benefit: 100,
            public_benefit_to_approved: 30,
            public_benefit_to_rejected: 70
        };
        
        // Prepare data for horizontal bar chart
        const chartData = {
            labels: [
                'Phase 1 → Cleared',
                'Phase 1 → Conditions',
                'Phase 1 → Phase 2',
                'Phase 2 → Cleared',
                'Phase 2 → Conditions',
                'Phase 2 → Rejected',
                'Rejected → Public Benefit',
                'Public Benefit → Approved',
                'Public Benefit → Rejected'
            ],
            datasets: [{
                label: 'Percentage',
                data: [
                    data.phase1_to_cleared,
                    data.phase1_to_conditions,
                    data.phase1_to_phase2,
                    data.phase2_to_cleared,
                    data.phase2_to_conditions,
                    data.phase2_to_rejected,
                    data.rejected_to_public_benefit,
                    data.public_benefit_to_approved,
                    data.public_benefit_to_rejected
                ],
                backgroundColor: [
                    'rgba(40, 167, 69, 0.7)',   // Phase 1 → Cleared
                    'rgba(255, 193, 7, 0.7)',   // Phase 1 → Conditions
                    'rgba(0, 123, 255, 0.7)',   // Phase 1 → Phase 2
                    'rgba(40, 167, 69, 0.7)',   // Phase 2 → Cleared
                    'rgba(255, 193, 7, 0.7)',   // Phase 2 → Conditions
                    'rgba(220, 53, 69, 0.7)',   // Phase 2 → Rejected
                    'rgba(111, 66, 193, 0.7)',  // Rejected → Public Benefit
                    'rgba(40, 167, 69, 0.7)',   // Public Benefit → Approved
                    'rgba(220, 53, 69, 0.7)'    // Public Benefit → Rejected
                ],
                borderColor: [
                    'rgba(40, 167, 69, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(0, 123, 255, 1)',
                    'rgba(40, 167, 69, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(220, 53, 69, 1)',
                    'rgba(111, 66, 193, 1)',
                    'rgba(40, 167, 69, 1)',
                    'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 1
            }]
        };
        
        // Chart options
        const options = {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentage'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            return `${value}%`;
                        }
                    }
                }
            }
        };
        
        // Create chart
        phaseProgressionChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: options
        });
    };
    
    // Render the industry chart
    const renderIndustryChart = (industries) => {
        const chartContainer = document.getElementById('industry-chart');
        
        // Clear previous chart if exists
        if (industryChart) {
            industryChart.destroy();
        }
        
        // Clear the container
        chartContainer.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Sort industries by count (descending)
        industries.sort((a, b) => b.count - a.count);
        
        // Take top 10 industries
        const topIndustries = industries.slice(0, 10);
        
        // Prepare data
        const chartData = {
            labels: topIndustries.map(industry => industry.industry),
            datasets: [{
                label: 'Number of Reviews',
                data: topIndustries.map(industry => industry.count),
                backgroundColor: 'rgba(0, 123, 255, 0.7)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        };
        
        // Chart options
        const options = {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Reviews'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        };
        
        // Create chart
        industryChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: options
        });
    };
    
    // Render the extensions analysis chart
    const renderExtensionsChart = () => {
        const chartContainer = document.getElementById('extensions-chart');
        
        // Clear previous chart if exists
        if (extensionsChart) {
            extensionsChart.destroy();
        }
        
        // Clear the container
        chartContainer.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Generate dummy data for demonstration
        const data = {
            categories: [
                'Information Request',
                'Commitment',
                'Section 155 Notice',
                'Party Request'
            ],
            phase1: [5, 8, 2, 4],
            phase2: [3, 6, 8, 5],
            public_benefit: [1, 2, 3, 7]
        };
        
        // Prepare data
        const chartData = {
            labels: data.categories,
            datasets: [
                {
                    label: 'Phase 1',
                    data: data.phase1,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Phase 2',
                    data: data.phase2,
                    backgroundColor: 'rgba(253, 126, 20, 0.7)',
                    borderColor: 'rgba(253, 126, 20, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Public Benefit',
                    data: data.public_benefit,
                    backgroundColor: 'rgba(111, 66, 193, 0.7)',
                    borderColor: 'rgba(111, 66, 193, 1)',
                    borderWidth: 1
                }
            ]
        };
        
        // Chart options
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Extensions'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        };
        
        // Create chart
        extensionsChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: options
        });
    };
    
    // Set up event listeners
    const setupEventListeners = () => {
        // Filter apply button
        const filterApplyButton = document.getElementById('stats-filter-apply');
        if (filterApplyButton) {
            filterApplyButton.addEventListener('click', () => {
                applyFilters();
            });
        }
        
        // Filter reset button
        const filterResetButton = document.getElementById('stats-filter-reset');
        if (filterResetButton) {
            filterResetButton.addEventListener('click', () => {
                resetFilters();
            });
        }
    };
    
    // Apply filters from form inputs
    const applyFilters = () => {
        // Get filter values
        const dateFrom = document.getElementById('stats-date-from');
        const dateTo = document.getElementById('stats-date-to');
        
        // Update current filters
        filterDateFrom = dateFrom ? dateFrom.value : '';
        filterDateTo = dateTo ? dateTo.value : '';
        
        // Navigate with new filters
        Router.navigate('statistics', {
            dateFrom: filterDateFrom,
            dateTo: filterDateTo
        });
    };
    
    // Reset all filters
    const resetFilters = () => {
        // Reset filter inputs
        const dateFrom = document.getElementById('stats-date-from');
        if (dateFrom) {
            dateFrom.value = '';
        }
        
        const dateTo = document.getElementById('stats-date-to');
        if (dateTo) {
            dateTo.value = '';
        }
        
        // Reset current filters
        filterDateFrom = '';
        filterDateTo = '';
        
        // Navigate with reset filters
        Router.navigate('statistics');
    };
    
    // Clean up when leaving the page
    const destroy = () => {
        // Cleanup charts
        if (outcomesChart) {
            outcomesChart.destroy();
            outcomesChart = null;
        }
        
        if (durationChart) {
            durationChart.destroy();
            durationChart = null;
        }
        
        if (reviewsTimeChart) {
            reviewsTimeChart.destroy();
            reviewsTimeChart = null;
        }
        
        if (phaseProgressionChart) {
            phaseProgressionChart.destroy();
            phaseProgressionChart = null;
        }
        
        if (industryChart) {
            industryChart.destroy();
            industryChart = null;
        }
        
        if (extensionsChart) {
            extensionsChart.destroy();
            extensionsChart = null;
        }
    };
    
    // Export statistics data
    const exportData = async () => {
        try {
            // Load data
            const [outcomes, duration, industries] = await Promise.all([
                API.getStatisticsOutcomes(),
                API.getStatisticsDuration(),
                API.getStatisticsByIndustry()
            ]);
            
            // Format data for export
            const exportData = [];
            
            // Add filter information
            exportData.push({ Category: 'Filters', Metric: 'Date From', Value: filterDateFrom || 'All' });
            exportData.push({ Category: 'Filters', Metric: 'Date To', Value: filterDateTo || 'All' });
            
            // Add outcomes
            exportData.push({ Category: 'Outcomes', Metric: 'Cleared', Value: outcomes.cleared });
            exportData.push({ Category: 'Outcomes', Metric: 'Cleared with Conditions', Value: outcomes.cleared_with_conditions });
            exportData.push({ Category: 'Outcomes', Metric: 'Rejected', Value: outcomes.rejected });
            exportData.push({ Category: 'Outcomes', Metric: 'Withdrawn', Value: outcomes.withdrawn });
            exportData.push({ Category: 'Outcomes', Metric: 'Pending', Value: outcomes.pending });
            
            // Add durations
            exportData.push({ Category: 'Duration', Metric: 'Average Phase 1 (days)', Value: duration.average_phase1_days });
            exportData.push({ Category: 'Duration', Metric: 'Average Phase 2 (days)', Value: duration.average_phase2_days });
            exportData.push({ Category: 'Duration', Metric: 'Average Public Benefit (days)', Value: duration.average_public_benefit_days });
            
            // Add industries
            industries.forEach(industry => {
                exportData.push({ Category: 'Industry', Metric: industry.industry, Value: industry.count });
            });
            
            // Generate filename with date
            const today = new Date();
            const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
            const filename = `merger_statistics_${dateString}.csv`;
            
            App.exportToCSV(exportData, filename);
            
        } catch (error) {
            console.error('Error exporting statistics data:', error);
            App.showNotification('Export Error', 'Failed to export statistics data.', 'error');
        }
    };
    
    return {
        init,
        destroy,
        exportData
    };
})();