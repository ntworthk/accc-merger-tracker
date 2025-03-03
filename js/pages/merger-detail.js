/**
 * merger-detail.js - Merger detail page controller for the Merger Tracker application
 * Displays comprehensive information about a single merger
 */

const MergerDetail = (() => {
    // Current merger data
    let currentMerger = null;
    
    // Initialize the merger detail page
    const init = async (params = {}) => {
        try {
            const mergerId = params.id;
            
            if (!mergerId) {
                App.showNotification('Error', 'No merger ID provided.', 'error');
                Router.goToMergersList();
                return;
            }
            
            // Show loading state
            document.getElementById('merger-title').textContent = 'Loading...';
            
            // Fetch merger data
            currentMerger = await API.getMergerById(parseInt(mergerId));
            
            // Render merger details
            renderMergerDetails(currentMerger);
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing merger detail:', error);
            App.showNotification('Error', 'Failed to load merger details.', 'error');
        }
    };
    
    // Render merger details
    const renderMergerDetails = (merger) => {
        if (!merger) return;
        
        // Update page title
        document.title = `Merger Tracker - ${merger.title}`;
        
        // Basic merger information
        document.getElementById('merger-title').textContent = merger.title;
        document.getElementById('merger-status-badge').className = `badge ${Formatters.formatStatus(merger.status).className}`;
        document.getElementById('merger-status-badge').textContent = Formatters.formatStatus(merger.status).text;
        
        // Show phase badge if applicable
        const phaseElement = document.getElementById('merger-phase-badge');
        
        if (merger.status === 'phase1') {
            phaseElement.className = 'badge badge-phase1';
            phaseElement.textContent = 'Phase 1';
        } else if (merger.status === 'phase2') {
            phaseElement.className = 'badge badge-phase2';
            phaseElement.textContent = 'Phase 2';
        } else if (merger.status === 'public-benefit') {
            phaseElement.className = 'badge badge-public-benefit';
            phaseElement.textContent = 'Public Benefit';
        } else {
            phaseElement.style.display = 'none';
        }
        
        // Overview information
        document.getElementById('merger-acquirer').textContent = merger.acquirer.name;
        document.getElementById('merger-target').textContent = merger.target.name;
        document.getElementById('merger-type').textContent = merger.acquisition_type === 'shares' ? 
            'Share Acquisition' : merger.acquisition_type === 'assets' ? 'Asset Acquisition' : merger.acquisition_type;
        document.getElementById('merger-notification-date').textContent = DateUtils.formatDate(merger.notification_date);
        
        // Expected completion date
        let expectedCompletion = 'N/A';
        
        if (merger.phase1 && !merger.phase1.actual_end_date) {
            expectedCompletion = merger.phase1.expected_end_date;
        } else if (merger.phase2 && !merger.phase2.actual_end_date) {
            expectedCompletion = merger.phase2.expected_end_date;
        } else if (merger.public_benefit && !merger.public_benefit.actual_determination_date) {
            expectedCompletion = merger.public_benefit.expected_determination_date;
        } else if (merger.status === 'completed' || merger.status === 'rejected' || merger.status === 'withdrawn') {
            // Find the most recent end date
            if (merger.public_benefit && merger.public_benefit.actual_determination_date) {
                expectedCompletion = merger.public_benefit.actual_determination_date;
            } else if (merger.phase2 && merger.phase2.actual_end_date) {
                expectedCompletion = merger.phase2.actual_end_date;
            } else if (merger.phase1 && merger.phase1.actual_end_date) {
                expectedCompletion = merger.phase1.actual_end_date;
            }
        }
        
        document.getElementById('merger-expected-completion').textContent = DateUtils.formatDate(expectedCompletion);
        
        // Markets
        document.getElementById('merger-markets').textContent = merger.markets && merger.markets.length > 0 ? 
            merger.markets.join(', ') : 'N/A';
        
        // Description
        document.getElementById('merger-description').textContent = merger.description || 'No description available.';
        
        // Timeline visualization
        document.getElementById('timeline-visualization').innerHTML = Timeline.createDetailedTimeline(merger);
        
        // Phase 1 details
        const phase1Card = document.getElementById('phase1-details-card');
        if (merger.phase1) {
            document.getElementById('phase1-start-date').textContent = DateUtils.formatDate(merger.phase1.start_date);
            document.getElementById('phase1-expected-end-date').textContent = DateUtils.formatDate(merger.phase1.expected_end_date);
            document.getElementById('phase1-actual-end-date').textContent = merger.phase1.actual_end_date ? 
                DateUtils.formatDate(merger.phase1.actual_end_date) : 'Pending';
            
            const outcomeElement = document.getElementById('phase1-outcome');
            if (merger.phase1.outcome) {
                const { text, className } = Formatters.formatOutcome(merger.phase1.outcome);
                outcomeElement.innerHTML = Formatters.outcomeBadge(merger.phase1.outcome);
            } else {
                outcomeElement.textContent = 'Pending';
            }
            
            document.getElementById('phase1-determination-details').textContent = 
                merger.phase1.determination_details || 'No details available.';
            
            // Documents
            const documentsElement = document.getElementById('phase1-documents');
            if (merger.phase1.determination_link) {
                documentsElement.innerHTML = `
                    <li>
                        <a href="${merger.phase1.determination_link}" target="_blank">
                            <i class="fas fa-file-pdf"></i> Phase 1 Determination
                        </a>
                    </li>
                `;
            } else {
                documentsElement.innerHTML = '<li>No documents available</li>';
            }
        } else {
            phase1Card.style.display = 'none';
        }
        
        // Phase 2 details
        const phase2Card = document.getElementById('phase2-details-card');
        if (merger.phase2) {
            document.getElementById('phase2-start-date').textContent = DateUtils.formatDate(merger.phase2.start_date);
            document.getElementById('phase2-concerns-due-date').textContent = DateUtils.formatDate(merger.phase2.competition_concerns_due_date);
            document.getElementById('phase2-concerns-issued-date').textContent = merger.phase2.competition_concerns_issued_date ? 
                DateUtils.formatDate(merger.phase2.competition_concerns_issued_date) : 'Pending';
            document.getElementById('phase2-submissions-due-date').textContent = merger.phase2.submissions_due_date ? 
                DateUtils.formatDate(merger.phase2.submissions_due_date) : 'N/A';
            document.getElementById('phase2-expected-end-date').textContent = DateUtils.formatDate(merger.phase2.expected_end_date);
            document.getElementById('phase2-actual-end-date').textContent = merger.phase2.actual_end_date ? 
                DateUtils.formatDate(merger.phase2.actual_end_date) : 'Pending';
            
            const outcomeElement = document.getElementById('phase2-outcome');
            if (merger.phase2.outcome) {
                const { text, className } = Formatters.formatOutcome(merger.phase2.outcome);
                outcomeElement.innerHTML = Formatters.outcomeBadge(merger.phase2.outcome);
            } else {
                outcomeElement.textContent = 'Pending';
            }
            
            document.getElementById('phase2-concerns-details').textContent = 
                merger.phase2.competition_concerns_details || 'No competition concerns issued yet.';
            
            document.getElementById('phase2-determination-details').textContent = 
                merger.phase2.determination_details || 'No details available.';
            
            // Documents
            const documentsElement = document.getElementById('phase2-documents');
            let documentsHTML = '';
            
            if (merger.phase2.competition_concerns_issued_date) {
                documentsHTML += `
                    <li>
                        <a href="#" onclick="return false;">
                            <i class="fas fa-file-pdf"></i> Statement of Competition Concerns
                        </a>
                    </li>
                `;
            }
            
            if (merger.phase2.determination_link) {
                documentsHTML += `
                    <li>
                        <a href="${merger.phase2.determination_link}" target="_blank">
                            <i class="fas fa-file-pdf"></i> Phase 2 Determination
                        </a>
                    </li>
                `;
            }
            
            if (documentsHTML) {
                documentsElement.innerHTML = documentsHTML;
            } else {
                documentsElement.innerHTML = '<li>No documents available</li>';
            }
        } else {
            phase2Card.style.display = 'none';
        }
        
        // Public Benefit details
        const publicBenefitCard = document.getElementById('public-benefit-details-card');
        if (merger.public_benefit) {
            document.getElementById('public-benefit-application-date').textContent = 
                DateUtils.formatDate(merger.public_benefit.application_date);
            document.getElementById('public-benefit-assessment-date').textContent = 
                merger.public_benefit.assessment_issued_date ? 
                DateUtils.formatDate(merger.public_benefit.assessment_issued_date) : 'Pending';
            document.getElementById('public-benefit-submissions-due-date').textContent = 
                merger.public_benefit.submissions_due_date ? 
                DateUtils.formatDate(merger.public_benefit.submissions_due_date) : 'N/A';
            document.getElementById('public-benefit-expected-determination-date').textContent = 
                DateUtils.formatDate(merger.public_benefit.expected_determination_date);
            document.getElementById('public-benefit-actual-determination-date').textContent = 
                merger.public_benefit.actual_determination_date ? 
                DateUtils.formatDate(merger.public_benefit.actual_determination_date) : 'Pending';
            
            const outcomeElement = document.getElementById('public-benefit-outcome');
            if (merger.public_benefit.outcome) {
                outcomeElement.innerHTML = `<span class="status-badge status-badge-${merger.public_benefit.outcome === 'approved' ? 'cleared' : 'rejected'}">
                    <i class="fas fa-circle"></i>
                    ${merger.public_benefit.outcome === 'approved' ? 'Approved' : 'Rejected'}
                </span>`;
            } else {
                outcomeElement.textContent = 'Pending';
            }
            
            document.getElementById('public-benefit-determination-details').textContent = 
                merger.public_benefit.determination_details || 'No details available.';
            
            // Documents
            const documentsElement = document.getElementById('public-benefit-documents');
            let documentsHTML = '';
            
            if (merger.public_benefit.assessment_issued_date) {
                documentsHTML += `
                    <li>
                        <a href="#" onclick="return false;">
                            <i class="fas fa-file-pdf"></i> Public Benefit Assessment
                        </a>
                    </li>
                `;
            }
            
            if (merger.public_benefit.determination_link) {
                documentsHTML += `
                    <li>
                        <a href="${merger.public_benefit.determination_link}" target="_blank">
                            <i class="fas fa-file-pdf"></i> Public Benefit Determination
                        </a>
                    </li>
                `;
            }
            
            if (documentsHTML) {
                documentsElement.innerHTML = documentsHTML;
            } else {
                documentsElement.innerHTML = '<li>No documents available</li>';
            }
        } else {
            publicBenefitCard.style.display = 'none';
        }
        
        // Conditions
        const conditionsCard = document.getElementById('conditions-card');
        const conditionsTableBody = document.getElementById('conditions-table-body');
        
        if (merger.conditions && merger.conditions.length > 0) {
            conditionsTableBody.innerHTML = '';
            
            merger.conditions.forEach(condition => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${condition.description}</td>
                    <td>${Formatters.conditionStatusBadge(condition.status)}</td>
                    <td>${DateUtils.formatDate(condition.deadline_date)}</td>
                    <td>${DateUtils.formatDate(condition.compliance_date) || 'N/A'}</td>
                `;
                conditionsTableBody.appendChild(tr);
            });
        } else {
            conditionsTableBody.innerHTML = '<tr><td colspan="4" class="no-data">No conditions imposed</td></tr>';
        }
        
        // Tribunal Reviews
        const tribunalReviewsCard = document.getElementById('tribunal-reviews-card');
        const tribunalReviewsTableBody = document.getElementById('tribunal-reviews-table-body');
        
        if (merger.tribunal_reviews && merger.tribunal_reviews.length > 0) {
            tribunalReviewsTableBody.innerHTML = '';
            
            merger.tribunal_reviews.forEach(review => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${review.accc_determination_type}</td>
                    <td>${DateUtils.formatDate(review.application_date)}</td>
                    <td>${review.applicant}</td>
                    <td>${DateUtils.formatDate(review.expected_determination_date)}</td>
                    <td>${DateUtils.formatDate(review.actual_determination_date) || 'Pending'}</td>
                    <td>${review.outcome || 'Pending'}</td>
                `;
                tribunalReviewsTableBody.appendChild(tr);
            });
        } else {
            tribunalReviewsCard.style.display = 'none';
        }
    };
    
    // Set up event listeners
    const setupEventListeners = () => {
        // Back button
        document.getElementById('back-button').addEventListener('click', () => {
            Router.goToMergersList();
        });
    };
    
    // Clean up when leaving the page
    const destroy = () => {
        // No cleanup needed for this page
    };
    
    // Export merger details data
    const exportData = () => {
        if (!currentMerger) {
            App.showNotification('Export Error', 'No merger data available to export.', 'error');
            return;
        }
        
        // Format data for export
        const exportData = [];
        
        // Basic information
        exportData.push({ Section: 'Basic Information', Field: 'Merger ID', Value: currentMerger.merger_id });
        exportData.push({ Section: 'Basic Information', Field: 'Title', Value: currentMerger.title });
        exportData.push({ Section: 'Basic Information', Field: 'Acquirer', Value: currentMerger.acquirer.name });
        exportData.push({ Section: 'Basic Information', Field: 'Target', Value: currentMerger.target.name });
        exportData.push({ Section: 'Basic Information', Field: 'Acquisition Type', Value: currentMerger.acquisition_type });
        exportData.push({ Section: 'Basic Information', Field: 'Status', Value: Formatters.formatStatus(currentMerger.status).text });
        exportData.push({ Section: 'Basic Information', Field: 'Notification Date', Value: currentMerger.notification_date });
        exportData.push({ Section: 'Basic Information', Field: 'Effective Notification Date', Value: currentMerger.effective_notification_date });
        exportData.push({ Section: 'Basic Information', Field: 'Markets', Value: (currentMerger.markets || []).join(', ') });
        exportData.push({ Section: 'Basic Information', Field: 'Description', Value: currentMerger.description });
        
        // Phase 1
        if (currentMerger.phase1) {
            exportData.push({ Section: 'Phase 1', Field: 'Start Date', Value: currentMerger.phase1.start_date });
            exportData.push({ Section: 'Phase 1', Field: 'Expected End Date', Value: currentMerger.phase1.expected_end_date });
            exportData.push({ Section: 'Phase 1', Field: 'Actual End Date', Value: currentMerger.phase1.actual_end_date });
            exportData.push({ Section: 'Phase 1', Field: 'Outcome', Value: Formatters.formatOutcome(currentMerger.phase1.outcome).text });
            exportData.push({ Section: 'Phase 1', Field: 'Determination Details', Value: currentMerger.phase1.determination_details });
        }
        
        // Phase 2
        if (currentMerger.phase2) {
            exportData.push({ Section: 'Phase 2', Field: 'Start Date', Value: currentMerger.phase2.start_date });
            exportData.push({ Section: 'Phase 2', Field: 'Competition Concerns Due', Value: currentMerger.phase2.competition_concerns_due_date });
            exportData.push({ Section: 'Phase 2', Field: 'Competition Concerns Issued', Value: currentMerger.phase2.competition_concerns_issued_date });
            exportData.push({ Section: 'Phase 2', Field: 'Submissions Due', Value: currentMerger.phase2.submissions_due_date });
            exportData.push({ Section: 'Phase 2', Field: 'Expected End Date', Value: currentMerger.phase2.expected_end_date });
            exportData.push({ Section: 'Phase 2', Field: 'Actual End Date', Value: currentMerger.phase2.actual_end_date });
            exportData.push({ Section: 'Phase 2', Field: 'Outcome', Value: Formatters.formatOutcome(currentMerger.phase2.outcome).text });
            exportData.push({ Section: 'Phase 2', Field: 'Competition Concerns Details', Value: currentMerger.phase2.competition_concerns_details });
            exportData.push({ Section: 'Phase 2', Field: 'Determination Details', Value: currentMerger.phase2.determination_details });
        }
        
        // Public Benefit
        if (currentMerger.public_benefit) {
            exportData.push({ Section: 'Public Benefit', Field: 'Application Date', Value: currentMerger.public_benefit.application_date });
            exportData.push({ Section: 'Public Benefit', Field: 'Assessment Issued', Value: currentMerger.public_benefit.assessment_issued_date });
            exportData.push({ Section: 'Public Benefit', Field: 'Submissions Due', Value: currentMerger.public_benefit.submissions_due_date });
            exportData.push({ Section: 'Public Benefit', Field: 'Expected Determination', Value: currentMerger.public_benefit.expected_determination_date });
            exportData.push({ Section: 'Public Benefit', Field: 'Actual Determination', Value: currentMerger.public_benefit.actual_determination_date });
            exportData.push({ Section: 'Public Benefit', Field: 'Outcome', Value: currentMerger.public_benefit.outcome });
            exportData.push({ Section: 'Public Benefit', Field: 'Determination Details', Value: currentMerger.public_benefit.determination_details });
        }
        
        // Conditions
        if (currentMerger.conditions && currentMerger.conditions.length > 0) {
            currentMerger.conditions.forEach((condition, index) => {
                exportData.push({ Section: `Condition ${index + 1}`, Field: 'Description', Value: condition.description });
                exportData.push({ Section: `Condition ${index + 1}`, Field: 'Status', Value: Formatters.formatConditionStatus(condition.status).text });
                exportData.push({ Section: `Condition ${index + 1}`, Field: 'Deadline', Value: condition.deadline_date });
                exportData.push({ Section: `Condition ${index + 1}`, Field: 'Compliance Date', Value: condition.compliance_date });
            });
        }
        
        // Timeline Events
        if (currentMerger.timeline_events && currentMerger.timeline_events.length > 0) {
            currentMerger.timeline_events.forEach((event, index) => {
                exportData.push({ Section: 'Timeline', Field: 'Event Date', Value: event.event_date });
                exportData.push({ Section: 'Timeline', Field: 'Event Type', Value: Formatters.formatEventType(event.event_type).text });
                exportData.push({ Section: 'Timeline', Field: 'Description', Value: event.event_description });
                exportData.push({ Section: 'Timeline', Field: 'Phase', Value: event.related_phase });
            });
        }
        
        App.exportToCSV(exportData, `merger_${currentMerger.merger_id}_details.csv`);
    };
    
    return {
        init,
        destroy,
        exportData
    };
})();
