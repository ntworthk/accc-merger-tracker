/**
 * status-badge.js - Status badge component for the Merger Tracker application
 * Creates consistent status indicators throughout the application
 */

const StatusBadge = (() => {
    // Create a status badge for merger status
    const createStatusBadge = (status) => {
        const { text, className } = Formatters.formatStatus(status);
        
        return `
            <span class="status-badge ${className}">
                <i class="fas fa-circle"></i>
                ${text}
            </span>
        `;
    };
    
    // Create a badge for phase 1 outcome
    const createPhase1OutcomeBadge = (outcome) => {
        const { text, className } = Formatters.formatOutcome(outcome);
        
        return `
            <span class="status-badge ${className}">
                <i class="fas fa-circle"></i>
                ${text}
            </span>
        `;
    };
    
    // Create a badge for phase 2 outcome
    const createPhase2OutcomeBadge = (outcome) => {
        const { text, className } = Formatters.formatOutcome(outcome);
        
        return `
            <span class="status-badge ${className}">
                <i class="fas fa-circle"></i>
                ${text}
            </span>
        `;
    };
    
    // Create a badge for public benefit outcome
    const createPublicBenefitOutcomeBadge = (outcome) => {
        let className, text;
        
        if (outcome === 'approved') {
            className = 'status-badge-cleared';
            text = 'Approved';
        } else if (outcome === 'rejected') {
            className = 'status-badge-rejected';
            text = 'Rejected';
        } else if (outcome === 'withdrawn') {
            className = 'status-badge-withdrawn';
            text = 'Withdrawn';
        } else {
            className = 'status-badge-pending';
            text = outcome || 'Pending';
        }
        
        return `
            <span class="status-badge ${className}">
                <i class="fas fa-circle"></i>
                ${text}
            </span>
        `;
    };
    
    // Create a badge for condition status
    const createConditionStatusBadge = (status) => {
        const { text, className } = Formatters.formatConditionStatus(status);
        
        return `
            <span class="status-badge ${className}">
                <i class="fas fa-circle"></i>
                ${text}
            </span>
        `;
    };
    
    // Create a badge for days remaining
    const createDaysRemainingBadge = (days) => {
        const { text, className } = DateUtils.formatDaysRemaining(days);
        
        return `
            <span class="days-countdown-badge ${className}">
                ${text}
            </span>
        `;
    };
    
    // Create a phase badge
    const createPhaseBadge = (phase) => {
        let className, text, icon;
        
        if (phase === 'phase1') {
            className = 'badge-phase1';
            text = 'Phase 1';
            icon = 'fa-hourglass-start';
        } else if (phase === 'phase2') {
            className = 'badge-phase2';
            text = 'Phase 2';
            icon = 'fa-hourglass-half';
        } else if (phase === 'public-benefit') {
            className = 'badge-public-benefit';
            text = 'Public Benefit';
            icon = 'fa-balance-scale';
        } else {
            className = 'badge-secondary';
            text = phase || 'Unknown';
            icon = 'fa-question-circle';
        }
        
        return `
            <span class="badge ${className}">
                <i class="fas ${icon}"></i>
                ${text}
            </span>
        `;
    };
    
    // Create an event type badge
    const createEventTypeBadge = (eventType) => {
        const { text, icon } = Formatters.formatEventType(eventType);
        
        return `
            <span class="badge badge-secondary">
                <i class="fas ${icon}"></i>
                ${text}
            </span>
        `;
    };
    
    // Create a badge for conditional approval
    const createConditionsAppliedBadge = () => {
        return `
            <span class="badge badge-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Conditions Applied
            </span>
        `;
    };
    
    // Create a progress indicator
    const createProgressIndicator = (merger) => {
        const progress = Formatters.calculateProgress(merger);
        
        // Determine the phase for styling
        let phaseClass = '';
        if (merger.status === 'phase1') {
            phaseClass = 'progress-bar-phase1';
        } else if (merger.status === 'phase2') {
            phaseClass = 'progress-bar-phase2';
        } else if (merger.status === 'public-benefit') {
            phaseClass = 'progress-bar-public-benefit';
        } else if (['completed', 'cleared'].includes(merger.status)) {
            phaseClass = 'progress-bar-completed';
        }
        
        return `
            <div class="progress-container">
                <div class="progress-bar ${phaseClass}" style="width: ${progress}%"></div>
            </div>
            <div class="progress-label">
                <span>${progress.toFixed(0)}% complete</span>
                <span>${Formatters.formatStatus(merger.status).text}</span>
            </div>
        `;
    };
    
    // Create a notification badge
    const createNotificationRequiredBadge = (required) => {
        if (required) {
            return `
                <span class="badge badge-info">
                    <i class="fas fa-bell"></i>
                    Notification Required
                </span>
            `;
        }
        
        return `
            <span class="badge badge-secondary">
                <i class="fas fa-bell-slash"></i>
                Voluntary Notification
            </span>
        `;
    };
    
    // Update a DOM element with a status badge
    const updateElementWithStatusBadge = (elementId, status) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = createStatusBadge(status);
        }
    };
    
    // Update a DOM element with a phase 1 outcome badge
    const updateElementWithPhase1OutcomeBadge = (elementId, outcome) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = createPhase1OutcomeBadge(outcome);
        }
    };
    
    // Update a DOM element with a phase 2 outcome badge
    const updateElementWithPhase2OutcomeBadge = (elementId, outcome) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = createPhase2OutcomeBadge(outcome);
        }
    };
    
    // Update a DOM element with a public benefit outcome badge
    const updateElementWithPublicBenefitOutcomeBadge = (elementId, outcome) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = createPublicBenefitOutcomeBadge(outcome);
        }
    };
    
    // Update a DOM element with a condition status badge
    const updateElementWithConditionStatusBadge = (elementId, status) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = createConditionStatusBadge(status);
        }
    };
    
    // Update a DOM element with a days remaining badge
    const updateElementWithDaysRemainingBadge = (elementId, days) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = createDaysRemainingBadge(days);
        }
    };
    
    return {
        createStatusBadge,
        createPhase1OutcomeBadge,
        createPhase2OutcomeBadge,
        createPublicBenefitOutcomeBadge,
        createConditionStatusBadge,
        createDaysRemainingBadge,
        createPhaseBadge,
        createEventTypeBadge,
        createConditionsAppliedBadge,
        createProgressIndicator,
        createNotificationRequiredBadge,
        updateElementWithStatusBadge,
        updateElementWithPhase1OutcomeBadge,
        updateElementWithPhase2OutcomeBadge,
        updateElementWithPublicBenefitOutcomeBadge,
        updateElementWithConditionStatusBadge,
        updateElementWithDaysRemainingBadge
    };
})();