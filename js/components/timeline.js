/**
 * timeline.js - Timeline visualization component for the Merger Tracker application
 * Creates interactive timelines for merger review processes
 */

const Timeline = (() => {
    // Create a simple timeline for the mergers list view
    const createSimpleTimeline = (merger) => {
        if (!merger) return '';

        // Calculate progress percentage
        const progress = Formatters.calculateProgress(merger);

        // Get the phases this merger has gone through
        const hasPhase1 = merger.phase1 ? true : false;
        const hasPhase2 = merger.phase2 ? true : false;
        const hasPublicBenefit = merger.public_benefit ? true : false;

        // Determine active phase
        const activePhase = merger.status;

        return `
            <div class="timeline">
                <div class="timeline-track"></div>
                <div class="timeline-progress" style="width: ${progress}%"></div>
                <div class="timeline-nodes">
                    <div class="timeline-node ${activePhase === 'pending' ? 'current' : (hasPhase1 ? 'completed' : '')}">
                        <div class="timeline-node-icon">
                            <i class="fas ${activePhase === 'pending' ? 'fa-clock' : 'fa-check'}"></i>
                        </div>
                        <div class="timeline-node-label">Notification</div>
                    </div>
                    <div class="timeline-node ${activePhase === 'phase1' ? 'current' : (hasPhase2 || hasPublicBenefit || ['completed', 'cleared', 'rejected', 'withdrawn'].includes(activePhase) ? 'completed' : '')}">
                        <div class="timeline-node-icon">
                            <i class="fas ${activePhase === 'phase1' ? 'fa-hourglass-start' : 'fa-check'}"></i>
                        </div>
                        <div class="timeline-node-label">Phase 1</div>
                    </div>
                    <div class="timeline-node ${activePhase === 'phase2' ? 'current' : (hasPublicBenefit || activePhase === 'completed' ? 'completed' : '')}">
                        <div class="timeline-node-icon">
                            <i class="fas ${activePhase === 'phase2' ? 'fa-hourglass-half' : 'fa-check'}"></i>
                        </div>
                        <div class="timeline-node-label">Phase 2</div>
                    </div>
                    <div class="timeline-node ${activePhase === 'public-benefit' ? 'current' : (activePhase === 'completed' && hasPublicBenefit ? 'completed' : '')}">
                        <div class="timeline-node-icon">
                            <i class="fas ${activePhase === 'public-benefit' ? 'fa-balance-scale' : 'fa-check'}"></i>
                        </div>
                        <div class="timeline-node-label">Public Benefit</div>
                    </div>
                </div>
            </div>
        `;
    };

    // Create a detailed timeline for the merger detail view
    const createDetailedTimeline = (merger) => {
        if (!merger) return '';

        // Get all the phases and dates
        const notificationDate = merger.notification_date;
        const phase1 = merger.phase1 || {};
        const phase2 = merger.phase2 || {};
        const publicBenefit = merger.public_benefit || {};

        // Determine phase statuses
        const status = merger.status;
        const hasPhase1 = phase1.start_date ? true : false;
        const hasPhase2 = phase2.start_date ? true : false;
        const hasPublicBenefit = publicBenefit.application_date ? true : false;

        // Create milestone nodes
        const milestones = [];

        // Notification milestone
        milestones.push({
            date: notificationDate,
            label: 'Notification',
            status: 'completed',
            icon: 'fa-file-alt'
        });

        // Phase 1 milestone
        if (hasPhase1) {
            const phase1Status = phase1.actual_end_date ? 'completed' : 'current';
            milestones.push({
                date: phase1.start_date,
                label: 'Phase 1 Start',
                status: 'completed',
                icon: 'fa-play'
            });

            if (phase1.actual_end_date) {
                const phase1Outcome = phase1.outcome || 'cleared';
                const outcomeIcon = {
                    'phase2': 'fa-arrow-right',
                    'cleared': 'fa-check-circle',
                    'conditions': 'fa-file-contract',
                    'rejected': 'fa-times-circle',
                    'withdrawn': 'fa-arrow-circle-left'
                }[phase1Outcome] || 'fa-flag';

                milestones.push({
                    date: phase1.actual_end_date,
                    label: `Phase 1 ${Formatters.formatOutcome(phase1Outcome).text}`,
                    status: 'completed',
                    icon: outcomeIcon
                });
            } else {
                milestones.push({
                    date: phase1.expected_end_date,
                    label: 'Phase 1 Decision Due',
                    status: 'upcoming',
                    icon: 'fa-calendar-check'
                });
            }
        }

        // Phase 2 milestone
        if (hasPhase2) {
            milestones.push({
                date: phase2.start_date,
                label: 'Phase 2 Start',
                status: 'completed',
                icon: 'fa-play'
            });

            if (phase2.competition_concerns_issued_date) {
                milestones.push({
                    date: phase2.competition_concerns_issued_date,
                    label: 'Competition Concerns',
                    status: 'completed',
                    icon: 'fa-exclamation-triangle'
                });
            } else if (phase2.competition_concerns_due_date) {
                milestones.push({
                    date: phase2.competition_concerns_due_date,
                    label: 'Concerns Due',
                    status: 'upcoming',
                    icon: 'fa-calendar-check'
                });
            }

            if (phase2.actual_end_date) {
                const phase2Outcome = phase2.outcome || 'cleared';
                const outcomeIcon = {
                    'cleared': 'fa-check-circle',
                    'conditions': 'fa-file-contract',
                    'rejected': 'fa-times-circle',
                    'withdrawn': 'fa-arrow-circle-left'
                }[phase2Outcome] || 'fa-flag';

                milestones.push({
                    date: phase2.actual_end_date,
                    label: `Phase 2 ${Formatters.formatOutcome(phase2Outcome).text}`,
                    status: 'completed',
                    icon: outcomeIcon
                });
            } else {
                milestones.push({
                    date: phase2.expected_end_date,
                    label: 'Phase 2 Decision Due',
                    status: 'upcoming',
                    icon: 'fa-calendar-check'
                });
            }
        }

        // Public Benefit milestone
        if (hasPublicBenefit) {
            milestones.push({
                date: publicBenefit.application_date,
                label: 'Public Benefit Application',
                status: 'completed',
                icon: 'fa-balance-scale'
            });

            if (publicBenefit.assessment_issued_date) {
                milestones.push({
                    date: publicBenefit.assessment_issued_date,
                    label: 'Public Benefit Assessment',
                    status: 'completed',
                    icon: 'fa-file-invoice'
                });
            } else if (publicBenefit.assessment_issued_date) {
                milestones.push({
                    date: publicBenefit.assessment_issued_date,
                    label: 'Assessment Due',
                    status: 'upcoming',
                    icon: 'fa-calendar-check'
                });
            }

            if (publicBenefit.actual_determination_date) {
                const pbOutcome = publicBenefit.outcome || 'cleared';
                const outcomeIcon = {
                    'approved': 'fa-check-circle',
                    'rejected': 'fa-times-circle',
                    'withdrawn': 'fa-arrow-circle-left'
                }[pbOutcome] || 'fa-flag';

                milestones.push({
                    date: publicBenefit.actual_determination_date,
                    label: `Public Benefit ${pbOutcome === 'approved' ? 'Approved' : 'Rejected'}`,
                    status: 'completed',
                    icon: outcomeIcon
                });
            } else {
                milestones.push({
                    date: publicBenefit.expected_determination_date,
                    label: 'Public Benefit Decision Due',
                    status: 'upcoming',
                    icon: 'fa-calendar-check'
                });
            }
        }

        // Sort milestones by date
        milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate progress percentage based on milestones
        let completedMilestones = 0;
        let totalMilestones = milestones.length;

        for (const milestone of milestones) {
            if (milestone.status === 'completed') {
                completedMilestones++;
            }
        }

        const progress = (completedMilestones / totalMilestones) * 100;

        // Create the HTML
        let timelineHTML = `
            <div class="timeline">
                <div class="timeline-track"></div>
                <div class="timeline-progress" style="width: ${progress}%"></div>
                <div class="timeline-nodes">
        `;

        // Add milestone nodes
        milestones.forEach(milestone => {
            const formattedDate = DateUtils.formatDate(milestone.date);
            timelineHTML += `
                <div class="timeline-node ${milestone.status}">
                    <div class="timeline-node-icon">
                        <i class="fas ${milestone.icon}"></i>
                    </div>
                    <div class="timeline-node-date">${formattedDate}</div>
                    <div class="timeline-node-label">${milestone.label}</div>
                </div>
            `;
        });

        timelineHTML += `
                </div>
            </div>
            <div class="detailed-timeline">
                <div class="timeline-track"></div>
                <div class="timeline-progress" style="height: ${progress}%"></div>
        `;

        // Add timeline events
        if (merger.timeline_events && merger.timeline_events.length > 0) {
            timelineHTML += `<div class="timeline-events">`;

            merger.timeline_events.forEach(event => {
                const formattedDate = DateUtils.formatDate(event.event_date);
                const eventType = Formatters.formatEventType(event.event_type);
                const eventPhase = Formatters.formatEventPhase(event.related_phase);

                timelineHTML += `
                    <div class="timeline-event ${eventPhase.className}">
                        <div class="timeline-event-dot"></div>
                        <div class="timeline-event-date">${formattedDate}</div>
                        <div class="timeline-event-content">
                            <div class="timeline-event-title">
                                <i class="fas ${eventType.icon}"></i> ${eventType.text}
                            </div>
                            <div class="timeline-event-description">${event.event_description}</div>
                        </div>
                    </div>
                `;
            });

            timelineHTML += `</div>`;
        }

        timelineHTML += `</div>`;
        return timelineHTML;
    };

    // Create a progress bar for the mergers list view
    const createProgressBar = (merger) => {
        if (!merger) return '';

        // Calculate progress
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

    return {
        createSimpleTimeline,
        createDetailedTimeline,
        createProgressBar
    };
})();
