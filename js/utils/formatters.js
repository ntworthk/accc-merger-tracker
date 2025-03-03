/**
 * formatters.js - Formatting utility functions for the Merger Tracker application
 */

const Formatters = (() => {
    // Format status for display
    const formatStatus = (status) => {
        if (!status) return { text: 'Unknown', className: '' };
        
        const statusMap = {
            'pending': { text: 'Pending', className: 'status-badge-pending' },
            'phase1': { text: 'Phase 1', className: 'status-badge-phase1' },
            'phase2': { text: 'Phase 2', className: 'status-badge-phase2' },
            'public-benefit': { text: 'Public benefit', className: 'status-badge-public-benefit' },
            'completed': { text: 'Completed', className: 'status-badge-completed' },
            'cleared': { text: 'Cleared', className: 'status-badge-cleared' },
            'conditions': { text: 'Cleared with conditions', className: 'status-badge-conditions' },
            'rejected': { text: 'Rejected', className: 'status-badge-rejected' },
            'withdrawn': { text: 'Withdrawn', className: 'status-badge-withdrawn' }
        };
        
        return statusMap[status] || { text: status, className: '' };
    };
    
    // Format status as an HTML badge
    const statusBadge = (status) => {
        const { text, className } = formatStatus(status);
        
        return `<span class="status-badge ${className}">
            <i class="fas fa-circle"></i>
            ${text}
        </span>`;
    };
    
    // Format review phase outcome
    const formatOutcome = (outcome) => {
        if (!outcome) return { text: 'Pending', className: 'status-badge-pending' };
        
        const outcomeMap = {
            'phase2': { text: 'Proceeded to phase 2', className: 'status-badge-phase2' },
            'cleared': { text: 'Cleared', className: 'status-badge-cleared' },
            'conditions': { text: 'Cleared with conditions', className: 'status-badge-conditions' },
            'rejected': { text: 'Rejected', className: 'status-badge-rejected' },
            'withdrawn': { text: 'Withdrawn', className: 'status-badge-withdrawn' }
        };
        
        return outcomeMap[outcome] || { text: outcome, className: '' };
    };
    
    // Format outcome as an HTML badge
    const outcomeBadge = (outcome) => {
        const { text, className } = formatOutcome(outcome);
        
        return `<span class="status-badge ${className}">
            <i class="fas fa-circle"></i>
            ${text}
        </span>`;
    };
    
    // Format condition status
    const formatConditionStatus = (status) => {
        if (!status) return { text: 'Unknown', className: '' };
        
        const statusMap = {
            'pending': { text: 'Pending', className: 'status-badge-pending' },
            'complied': { text: 'Complied', className: 'status-badge-cleared' },
            'breached': { text: 'Breached', className: 'status-badge-rejected' },
            'ongoing': { text: 'Ongoing', className: 'status-badge-phase1' }
        };
        
        return statusMap[status] || { text: status, className: '' };
    };
    
    // Format condition status as an HTML badge
    const conditionStatusBadge = (status) => {
        const { text, className } = formatConditionStatus(status);
        
        return `<span class="status-badge ${className}">
            <i class="fas fa-circle"></i>
            ${text}
        </span>`;
    };
    
    // Format event type
    const formatEventType = (eventType) => {
        if (!eventType) return { text: 'Event', className: '', icon: 'fa-circle' };
        
        const eventTypeMap = {
            'notification': { text: 'Notification', className: '', icon: 'fa-file-alt' },
            'phase_start': { text: 'Phase start', className: '', icon: 'fa-play' },
            'information_request': { text: 'Information request', className: '', icon: 'fa-question-circle' },
            'decision': { text: 'Decision', className: '', icon: 'fa-check-circle' },
            'concerns_notice': { text: 'Competition concerns', className: '', icon: 'fa-exclamation-triangle' },
            'submission': { text: 'Submission', className: '', icon: 'fa-paper-plane' },
            'commitment': { text: 'Commitment', className: '', icon: 'fa-handshake' },
            'public_benefit': { text: 'Public benefit', className: '', icon: 'fa-balance-scale' },
            'assessment': { text: 'Assessment', className: '', icon: 'fa-file-invoice' }
        };
        
        return eventTypeMap[eventType] || { text: eventType, className: '', icon: 'fa-circle' };
    };
    
    // Format event phase
    const formatEventPhase = (phase) => {
        if (!phase) return { className: '' };
        
        const phaseMap = {
            'pre-notification': { className: '' },
            'phase1': { className: 'phase1' },
            'phase2': { className: 'phase2' },
            'public_benefit': { className: 'public-benefit' }
        };
        
        return phaseMap[phase] || { className: '' };
    };
    
    // Generate a slug from a string (for URL generation)
    const generateSlug = (text) => {
        return text
            .toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    };
    
    // Truncate text with ellipsis
    const truncateText = (text, maxLength = 50) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };
    
    // Format a number with commas
    const formatNumber = (number) => {
        if (number === null || number === undefined) return 'N/A';
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
    
    // Calculate completion percentage for progress bars
    const calculateProgress = (merger) => {
        if (!merger) return 0;
        
        const { status } = merger;
        
        if (status === 'pending') {
            return 0;
        } else if (status === 'phase1') {
            // Calculate progress within phase 1
            if (merger.phase1) {
                const startDate = new Date(merger.phase1.start_date);
                const endDate = new Date(merger.phase1.expected_end_date);
                const today = new Date();
                
                if (today > endDate) {
                    return 100;
                }
                
                const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
                const daysElapsed = (today - startDate) / (1000 * 60 * 60 * 24);
                
                return Math.min(Math.floor((daysElapsed / totalDays) * 100), 100);
            }
            return 50;
        } else if (status === 'phase2') {
            // Phase 1 completed + progress within phase 2
            if (merger.phase2) {
                const startDate = new Date(merger.phase2.start_date);
                const endDate = new Date(merger.phase2.expected_end_date);
                const today = new Date();
                
                if (today > endDate) {
                    return 100;
                }
                
                const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
                const daysElapsed = (today - startDate) / (1000 * 60 * 60 * 24);
                const phase2Progress = Math.min(Math.floor((daysElapsed / totalDays) * 100), 100);
                
                // Phase 1 (33%) + portion of phase 2 (67%)
                return 33 + (phase2Progress * 0.67);
            }
            return 75;
        } else if (status === 'public-benefit') {
            // Phase 1 and 2 completed + progress within public benefit
            if (merger.public_benefit) {
                const startDate = new Date(merger.public_benefit.application_date);
                const endDate = new Date(merger.public_benefit.expected_determination_date);
                const today = new Date();
                
                if (today > endDate) {
                    return 100;
                }
                
                const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
                const daysElapsed = (today - startDate) / (1000 * 60 * 60 * 24);
                const pbProgress = Math.min(Math.floor((daysElapsed / totalDays) * 100), 100);
                
                // Phases 1 & 2 (75%) + portion of public benefit (25%)
                return 75 + (pbProgress * 0.25);
            }
            return 85;
        } else if (['completed', 'cleared', 'rejected', 'withdrawn'].includes(status)) {
            return 100;
        }
        
        return 0;
    };
    
    // Get icon for merger current status
    const getStatusIcon = (status) => {
        const iconMap = {
            'pending': 'fa-clock',
            'phase1': 'fa-hourglass-start',
            'phase2': 'fa-hourglass-half',
            'public-benefit': 'fa-balance-scale',
            'completed': 'fa-check-circle',
            'cleared': 'fa-check-circle',
            'rejected': 'fa-times-circle',
            'withdrawn': 'fa-arrow-circle-left'
        };
        
        return iconMap[status] || 'fa-circle';
    };
    
    // Format a date range (e.g., "15 Jan - 20 Feb 2025")
    const formatDateRange = (startDate, endDate) => {
        if (!startDate) return 'N/A';
        
        const start = new Date(startDate);
        
        if (!endDate) {
            return start.toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
        
        const end = new Date(endDate);
        
        // If same year, omit year from first date
        if (start.getFullYear() === end.getFullYear()) {
            const startStr = start.toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short'
            });
            
            const endStr = end.toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            
            return `${startStr} - ${endStr}`;
        }
        
        // Different years, include both years
        const startStr = start.toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        const endStr = end.toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        return `${startStr} - ${endStr}`;
    };
    
    return {
        formatStatus,
        statusBadge,
        formatOutcome,
        outcomeBadge,
        formatConditionStatus,
        conditionStatusBadge,
        formatEventType,
        formatEventPhase,
        generateSlug,
        truncateText,
        formatNumber,
        calculateProgress,
        getStatusIcon,
        formatDateRange
    };
})();
