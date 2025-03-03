/**
 * date-utils.js - Date calculation utilities for the Merger Tracker application
 * Handles business day calculations in accordance with the merger legislation
 */

const DateUtils = (() => {
    // Australian public holidays (would need to be updated annually)
    const publicHolidays = {
        // 2025 national holidays
        "2025-01-01": "New Year's Day",
        "2025-01-26": "Australia Day",
        "2025-01-27": "Australia Day (observed)",
        "2025-04-18": "Good Friday",
        "2025-04-19": "Easter Saturday",
        "2025-04-20": "Easter Sunday",
        "2025-04-21": "Easter Monday",
        "2025-04-25": "Anzac Day",
        "2025-06-09": "King's Birthday",
        "2025-12-25": "Christmas Day",
        "2025-12-26": "Boxing Day"
    };

    // ACT-specific holidays (since ACCC is based in Canberra)
    const actHolidays = {
        "2025-03-10": "Canberra Day",
        "2025-05-26": "Reconciliation Day",
        "2025-10-06": "Labour Day"
    };

    // Check if a date is a business day
    const isBusinessDay = (date) => {
        // Convert to date object if string
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Convert to ISO date string for comparison with holidays
        const dateStr = dateObj.toISOString().split('T')[0];
        
        // Check if weekend
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
        
        // Check if public holiday
        if (publicHolidays[dateStr] || actHolidays[dateStr]) {
            return false;
        }
        
        // Check if in Christmas/New Year exclusion period (Dec 23 - Jan 10)
        const month = dateObj.getMonth() + 1; // JS months are 0-indexed
        const day = dateObj.getDate();
        
        if ((month === 12 && day >= 23) || (month === 1 && day <= 10)) {
            return false;
        }
        
        return true;
    };

    // Add business days to a date
    const addBusinessDays = (date, days) => {
        let result = new Date(date);
        let daysAdded = 0;
        
        while (daysAdded < days) {
            result.setDate(result.getDate() + 1);
            if (isBusinessDay(result)) {
                daysAdded++;
            }
        }
        
        return result;
    };

    // Calculate business days between two dates
    const businessDaysBetween = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Validate input dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error('Invalid date provided');
        }
        
        // Ensure start date is before end date
        if (start > end) {
            return -businessDaysBetween(end, start);
        }
        
        // Convert to dates only (without time)
        const startDateOnly = new Date(start.toISOString().split('T')[0]);
        const endDateOnly = new Date(end.toISOString().split('T')[0]);
        
        let businessDays = 0;
        let currentDate = new Date(startDateOnly);
        
        // Count each business day between start and end
        while (currentDate <= endDateOnly) {
            if (isBusinessDay(currentDate)) {
                businessDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return businessDays;
    };

    // Calculate Phase 1 end date (30 business days from effective notification date)
    const calculatePhase1EndDate = (effectiveNotificationDate) => {
        return addBusinessDays(new Date(effectiveNotificationDate), 30).toISOString().split('T')[0];
    };

    // Calculate Phase 2 end date (90 business days from the end of Phase 1)
    const calculatePhase2EndDate = (phase1EndDate) => {
        return addBusinessDays(new Date(phase1EndDate), 90).toISOString().split('T')[0];
    };

    // Calculate Competition Concerns due date (25 business days from start of Phase 2)
    const calculateConcernsDueDate = (phase2StartDate) => {
        return addBusinessDays(new Date(phase2StartDate), 25).toISOString().split('T')[0];
    };

    // Calculate Submissions due date (25 business days from competition concerns issuance)
    const calculateSubmissionsDueDate = (concernsIssuedDate) => {
        return addBusinessDays(new Date(concernsIssuedDate), 25).toISOString().split('T')[0];
    };

    // Calculate Public Benefit Assessment date (20 business days from application date)
    const calculatePBAssessmentDate = (applicationDate) => {
        return addBusinessDays(new Date(applicationDate), 20).toISOString().split('T')[0];
    };

    // Calculate Public Benefit determination date (50 business days from application date)
    const calculatePBDeterminationDate = (applicationDate) => {
        return addBusinessDays(new Date(applicationDate), 50).toISOString().split('T')[0];
    };

    // Format a date as a readable string
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Calculate days remaining until a deadline
    const daysRemaining = (deadlineDate) => {
        if (!deadlineDate) return null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const deadline = new Date(deadlineDate);
        deadline.setHours(0, 0, 0, 0);
        
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    };

    // Calculate business days remaining until a deadline
    const businessDaysRemaining = (deadlineDate) => {
        if (!deadlineDate) return null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const deadline = new Date(deadlineDate);
        deadline.setHours(0, 0, 0, 0);
        
        if (today > deadline) return 0;
        if (today.getTime() === deadline.getTime()) return 0;
        
        return businessDaysBetween(today, deadline);
    };

    // Format the days remaining with an appropriate class name
    const formatDaysRemaining = (days) => {
        if (days === null) return { text: 'N/A', className: '' };
        
        if (days <= 0) {
            return { text: 'Today', className: 'days-urgent' };
        } else if (days <= 5) {
            return { text: `${days} days`, className: 'days-urgent' };
        } else if (days <= 10) {
            return { text: `${days} days`, className: 'days-warning' };
        } else {
            return { text: `${days} days`, className: 'days-normal' };
        }
    };

    return {
        isBusinessDay,
        addBusinessDays,
        businessDaysBetween,
        calculatePhase1EndDate,
        calculatePhase2EndDate,
        calculateConcernsDueDate,
        calculateSubmissionsDueDate,
        calculatePBAssessmentDate,
        calculatePBDeterminationDate,
        formatDate,
        daysRemaining,
        businessDaysRemaining,
        formatDaysRemaining
    };
})();
