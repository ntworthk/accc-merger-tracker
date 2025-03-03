/**
 * dashboard.js - Dashboard page controller for the Merger Tracker application
 * Displays overview statistics and recent activity
 */

const Dashboard = (() => {
    // Reference to charts for cleanup
    let statusChart = null;
    let durationChart = null;
    
    // Initialize the dashboard
    const init = async () => {
        try {
            // Load all required data in parallel
            const [summaryData, recentActivity, upcomingDeadlines] = await Promise.all([
                API.getStatisticsSummary(),
                API.getRecentActivity(10),
                API.getUpcomingDeadlines(10)
            ]);
            
            // Update stats cards
            updateStatsCards(summaryData);
            
            // Render activity list
            renderActivityList(recentActivity);
            
            // Render deadlines table
            renderDeadlinesTable(upcomingDeadlines);
            
            // Render charts
            renderStatusChart(summaryData);
            renderDurationChart();
            
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            App.showNotification('Error', 'Failed to load dashboard data.', 'error');
        }
    };
    
    // Update the stats cards with summary data
    const updateStatsCards = (summary) => {
        document.querySelector('#total-active-card .stats-card-value').textContent = 
            Formatters.formatNumber(summary.active_reviews);
            
        document.querySelector('#phase1-card .stats-card-value').textContent = 
            Formatters.formatNumber(summary.phase1_reviews);
            
        document.querySelector('#phase2-card .stats-card-value').textContent = 
            Formatters.formatNumber(summary.phase2_reviews);
            
        document.querySelector('#public-benefit-card .stats-card-value').textContent = 
            Formatters.formatNumber(summary.public_benefit_applications);
    };
    
    // Render the recent activity list
    const renderActivityList = (activities) => {
        const activityList = document.getElementById('activity-list');
        
        if (!activities || activities.length === 0) {
            activityList.innerHTML = '<li class="no-data">No recent activity</li>';
            return;
        }
        
        activityList.innerHTML = '';
        
        activities.forEach(activity => {
            const eventType = Formatters.formatEventType(activity.event_type);
            const eventDate = DateUtils.formatDate(activity.event_date);
            
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="activity-date">${eventDate}</div>
                <div class="activity-title">
                    <i class="fas ${eventType.icon}"></i>
                    ${activity.merger_title}
                </div>
                <div class="activity-description">${activity.event_description}</div>
            `;
            
            li.addEventListener('click', () => {
                Router.goToMergerDetail({ id: activity.merger_id });
            });
            
            activityList.appendChild(li);
        });
    };
    
    // Render the upcoming deadlines table
    const renderDeadlinesTable = (deadlines) => {
        const deadlinesTable = document.getElementById('deadlines-table').querySelector('tbody');
        
        if (!deadlines || deadlines.length === 0) {
            deadlinesTable.innerHTML = '<tr><td colspan="4" class="no-data">No upcoming deadlines</td></tr>';
            return;
        }
        
        deadlinesTable.innerHTML = '';
        
        deadlines.forEach(deadline => {
            const daysLeft = deadline.daysLeft;
            const daysLeftFormatted = daysLeft === 0 ? 'Today' : 
                                     daysLeft === 1 ? '1 day' :
                                     `${daysLeft} days`;
            
            const daysClass = daysLeft <= 5 ? 'days-urgent' : 
                             daysLeft <= 10 ? 'days-warning' : 
                             'days-normal';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${deadline.merger_title}</td>
                <td>${deadline.type}</td>
                <td>${DateUtils.formatDate(deadline.deadline)}</td>
                <td>
                    <div class="days-countdown">
                        <span class="days-countdown-badge ${daysClass}">${daysLeftFormatted}</span>
                    </div>
                </td>
            `;
            
            tr.addEventListener('click', () => {
                Router.goToMergerDetail({ id: deadline.merger_id });
            });
            
            deadlinesTable.appendChild(tr);
        });
    };
    
    // Render the status distribution chart
    const renderStatusChart = (summary) => {
        const chartContainer = document.getElementById('status-chart');
        
        // Clear previous chart if exists
        if (statusChart) {
            statusChart.destroy();
        }
        
        // Clear the container
        chartContainer.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Prepare data
        const data = {
            labels: ['Phase 1', 'Phase 2', 'Public benefit', 'Completed', 'Rejected', 'Withdrawn'],
            datasets: [{
                data: [
                    summary.phase1_reviews,
                    summary.phase2_reviews,
                    summary.public_benefit_applications,
                    summary.outcomes?.cleared || 0,
                    summary.outcomes?.rejected || 0,
                    summary.outcomes?.withdrawn || 0
                ],
                backgroundColor: [
                    '#007bff', // Phase 1
                    '#fd7e14', // Phase 2
                    '#6f42c1', // Public benefit
                    '#28a745', // Completed
                    '#dc3545', // Rejected
                    '#6c757d'  // Withdrawn
                ],
                borderWidth: 0
            }]
        };
        
        // Chart options
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
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
        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    };
    
    // Render the average duration chart
    const renderDurationChart = async () => {
        const chartContainer = document.getElementById('duration-chart');
        
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
        
        try {
            // Get duration data
            const durationData = await API.getStatisticsDuration();
            
            // Prepare data
            const data = {
                labels: ['Phase 1', 'Phase 2', 'Public benefit'],
                datasets: [{
                    label: 'Average days',
                    data: [
                        durationData.average_phase1_days,
                        durationData.average_phase2_days,
                        durationData.average_public_benefit_days
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
                }]
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
                            text: 'Business days'
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
            durationChart = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: options
            });
            
        } catch (error) {
            console.error('Error rendering duration chart:', error);
            chartContainer.innerHTML = 
                '<div class="chart-error">Failed to load duration data</div>';
        }
    };
    
    // Clean up when leaving the page
    const destroy = () => {
        if (statusChart) {
            statusChart.destroy();
            statusChart = null;
        }
        
        if (durationChart) {
            durationChart.destroy();
            durationChart = null;
        }
    };
    
    // Export dashboard data
    const exportData = async () => {
        try {
            const [summaryData, recentActivity, upcomingDeadlines] = await Promise.all([
                API.getStatisticsSummary(),
                API.getRecentActivity(10),
                API.getUpcomingDeadlines(10)
            ]);
            
            // Prepare data for export
            const data = [
                { section: 'Summary statistics', data: summaryData },
                { section: 'Recent activity', data: recentActivity },
                { section: 'Upcoming deadlines', data: upcomingDeadlines }
            ];
            
            // Create a formatted export
            const exportData = [
                { Type: 'Dashboard report', Date: new Date().toISOString() }
            ];
            
            // Add summary stats
            exportData.push({ Type: 'Summary', Category: 'Total notifications', Value: summaryData.total_notifications });
            exportData.push({ Type: 'Summary', Category: 'Active reviews', Value: summaryData.active_reviews });
            exportData.push({ Type: 'Summary', Category: 'Phase 1 reviews', Value: summaryData.phase1_reviews });
            exportData.push({ Type: 'Summary', Category: 'Phase 2 reviews', Value: summaryData.phase2_reviews });
            exportData.push({ Type: 'Summary', Category: 'Public benefit applications', Value: summaryData.public_benefit_applications });
            
            // Add deadlines
            upcomingDeadlines.forEach(deadline => {
                exportData.push({
                    Type: 'Deadline',
                    Category: deadline.type,
                    Value: deadline.merger_title,
                    Date: deadline.deadline,
                    DaysLeft: deadline.daysLeft
                });
            });
            
            // Add activities
            recentActivity.forEach(activity => {
                exportData.push({
                    Type: 'Activity',
                    Category: Formatters.formatEventType(activity.event_type).text,
                    Value: activity.merger_title,
                    Date: activity.event_date,
                    Description: activity.event_description
                });
            });
            
            App.exportToCSV(exportData, 'merger_tracker_dashboard.csv');
            
        } catch (error) {
            console.error('Error exporting dashboard data:', error);
            App.showNotification('Export Error', 'Failed to export dashboard data.', 'error');
        }
    };
    
    return {
        init,
        destroy,
        exportData
    };
})();