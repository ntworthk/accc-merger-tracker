/**
 * api.js - API service for the Merger Tracker application
 * Handles all API calls and provides mock data for testing
 */

const API = (() => {
    // Base API URL - replace with your actual API endpoint when available
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // Mock data for testing (will be replaced with actual API calls)
    const mockData = {
        mergers: [
            {
                merger_id: "c60a16f0-c432-4ebb-b9e3-62fdf7bc0f5b",
                title: "TechCorp acquisition of DataSystems Inc.",
                description: "Acquisition of a data analytics company to expand market reach in the business intelligence sector.",
                acquisition_type: "shares",
                acquirer: { company_id: 1, name: "TechCorp Ltd" },
                target: { company_id: 2, name: "DataSystems Inc." },
                status: "phase2",
                notification_required: true,
                notification_date: "2025-01-15",
                effective_notification_date: "2025-01-16",
                is_stale: false,
                is_subject_to_conditions: false,
                markets: ["Data Analytics", "Business Intelligence"],
                phase1: {
                    phase1_id: 1,
                    start_date: "2025-01-16",
                    expected_end_date: "2025-02-27",
                    actual_end_date: "2025-02-27",
                    outcome: "phase2"
                },
                phase2: {
                    phase2_id: 1,
                    start_date: "2025-02-28",
                    competition_concerns_due_date: "2025-04-04",
                    competition_concerns_issued_date: "2025-04-01",
                    competition_concerns_details: "The Commission has concerns about market concentration in the enterprise analytics sector.",
                    submissions_due_date: "2025-05-06",
                    expected_end_date: "2025-07-04",
                    actual_end_date: null,
                    outcome: null
                },
                timeline_events: [
                    { event_id: 1, event_date: "2025-01-15", event_type: "notification", event_description: "Merger notification submitted to ACCC", related_phase: "pre-notification" },
                    { event_id: 2, event_date: "2025-01-16", event_type: "phase_start", event_description: "Phase 1 review commenced", related_phase: "phase1" },
                    { event_id: 3, event_date: "2025-02-05", event_type: "information_request", event_description: "ACCC requested additional market information", related_phase: "phase1" },
                    { event_id: 4, event_date: "2025-02-27", event_type: "decision", event_description: "ACCC decided to proceed to Phase 2 review", related_phase: "phase1" },
                    { event_id: 5, event_date: "2025-02-28", event_type: "phase_start", event_description: "Phase 2 review commenced", related_phase: "phase2" },
                    { event_id: 6, event_date: "2025-04-01", event_type: "concerns_notice", event_description: "Statement of competition concerns issued", related_phase: "phase2" }
                ]
            },
            {
                merger_id: "a5d12714-3860-45f3-9a0c-5d9ab2245233",
                title: "RetailCo merger with OnlineMart",
                description: "Horizontal merger between retail chain and e-commerce platform to create an omnichannel retail business.",
                acquisition_type: "shares",
                acquirer: { company_id: 3, name: "RetailCo Holdings" },
                target: { company_id: 4, name: "OnlineMart Pty Ltd" },
                status: "phase1",
                notification_required: true,
                notification_date: "2025-02-10",
                effective_notification_date: "2025-02-11",
                is_stale: false,
                is_subject_to_conditions: false,
                markets: ["Retail", "E-commerce"],
                phase1: {
                    phase1_id: 2,
                    start_date: "2025-02-11",
                    expected_end_date: "2025-03-25",
                    actual_end_date: null,
                    outcome: null
                },
                timeline_events: [
                    { event_id: 7, event_date: "2025-02-10", event_type: "notification", event_description: "Merger notification submitted to ACCC", related_phase: "pre-notification" },
                    { event_id: 8, event_date: "2025-02-11", event_type: "phase_start", event_description: "Phase 1 review commenced", related_phase: "phase1" },
                    { event_id: 9, event_date: "2025-02-20", event_type: "information_request", event_description: "ACCC requested additional market information", related_phase: "phase1" }
                ]
            },
            {
                merger_id: "33cb17bf-f943-4f4e-b8cd-03633ad238c2",
                title: "EnergyAus acquisition of PowerGrid",
                description: "Vertical acquisition in the energy sector to integrate generation and distribution capabilities.",
                acquisition_type: "assets",
                acquirer: { company_id: 5, name: "EnergyAus Limited" },
                target: { company_id: 6, name: "PowerGrid Networks" },
                status: "completed",
                notification_required: true,
                notification_date: "2025-01-05",
                effective_notification_date: "2025-01-06",
                is_stale: false,
                is_subject_to_conditions: true,
                markets: ["Energy Generation", "Power Distribution"],
                phase1: {
                    phase1_id: 3,
                    start_date: "2025-01-06",
                    expected_end_date: "2025-02-17",
                    actual_end_date: "2025-02-15",
                    outcome: "conditions"
                },
                conditions: [
                    { 
                        condition_id: 1, 
                        description: "Divestiture of overlapping distribution assets in QLD region.",
                        status: "complied",
                        deadline_date: "2025-03-15",
                        compliance_date: "2025-03-10"
                    },
                    { 
                        condition_id: 2, 
                        description: "Price cap on wholesale energy contracts for 3 years.",
                        status: "ongoing",
                        deadline_date: "2028-02-15",
                        compliance_date: null
                    }
                ],
                timeline_events: [
                    { event_id: 10, event_date: "2025-01-05", event_type: "notification", event_description: "Merger notification submitted to ACCC", related_phase: "pre-notification" },
                    { event_id: 11, event_date: "2025-01-06", event_type: "phase_start", event_description: "Phase 1 review commenced", related_phase: "phase1" },
                    { event_id: 12, event_date: "2025-01-25", event_type: "commitment", event_description: "Parties offered divestiture commitment", related_phase: "phase1" },
                    { event_id: 13, event_date: "2025-02-15", event_type: "decision", event_description: "ACCC cleared with conditions", related_phase: "phase1" }
                ]
            },
            {
                merger_id: "7706b116-201e-46aa-ab27-4dc36a2eb4c0",
                title: "MiningCo acquisition of ResourceExtract",
                description: "Horizontal merger in the mining sector to consolidate operations and achieve economies of scale.",
                acquisition_type: "shares",
                acquirer: { company_id: 7, name: "MiningCo Australia" },
                target: { company_id: 8, name: "ResourceExtract Ltd" },
                status: "rejected",
                notification_required: true,
                notification_date: "2024-12-01",
                effective_notification_date: "2024-12-02",
                is_stale: false,
                is_subject_to_conditions: false,
                markets: ["Mining", "Mineral Resources"],
                phase1: {
                    phase1_id: 4,
                    start_date: "2024-12-02",
                    expected_end_date: "2025-01-15",
                    actual_end_date: "2025-01-15",
                    outcome: "phase2"
                },
                phase2: {
                    phase2_id: 2,
                    start_date: "2025-01-16",
                    competition_concerns_due_date: "2025-02-20",
                    competition_concerns_issued_date: "2025-02-18",
                    competition_concerns_details: "The Commission has significant concerns about market concentration in the iron ore sector.",
                    submissions_due_date: "2025-03-25",
                    expected_end_date: "2025-05-21",
                    actual_end_date: "2025-05-20",
                    outcome: "rejected"
                },
                public_benefit: {
                    application_id: 1,
                    application_date: "2025-05-25",
                    effective_application_date: "2025-05-26",
                    assessment_issued_date: "2025-06-23",
                    submissions_due_date: "2025-07-14",
                    expected_determination_date: "2025-08-04",
                    actual_determination_date: "2025-08-03",
                    outcome: "rejected",
                    determination_details: "The Commission is not satisfied that the public benefits outweigh the detriments to competition."
                },
                timeline_events: [
                    { event_id: 14, event_date: "2024-12-01", event_type: "notification", event_description: "Merger notification submitted to ACCC", related_phase: "pre-notification" },
                    { event_id: 15, event_date: "2024-12-02", event_type: "phase_start", event_description: "Phase 1 review commenced", related_phase: "phase1" },
                    { event_id: 16, event_date: "2025-01-15", event_type: "decision", event_description: "ACCC decided to proceed to Phase 2 review", related_phase: "phase1" },
                    { event_id: 17, event_date: "2025-01-16", event_type: "phase_start", event_description: "Phase 2 review commenced", related_phase: "phase2" },
                    { event_id: 18, event_date: "2025-02-18", event_type: "concerns_notice", event_description: "Statement of competition concerns issued", related_phase: "phase2" },
                    { event_id: 19, event_date: "2025-03-18", event_type: "submission", event_description: "Parties responded to competition concerns", related_phase: "phase2" },
                    { event_id: 20, event_date: "2025-05-20", event_type: "decision", event_description: "ACCC rejected the merger", related_phase: "phase2" },
                    { event_id: 21, event_date: "2025-05-25", event_type: "public_benefit", event_description: "Public benefit application submitted", related_phase: "public_benefit" },
                    { event_id: 22, event_date: "2025-06-23", event_type: "assessment", event_description: "Public benefit assessment issued", related_phase: "public_benefit" },
                    { event_id: 23, event_date: "2025-07-10", event_type: "submission", event_description: "Parties responded to public benefit assessment", related_phase: "public_benefit" },
                    { event_id: 24, event_date: "2025-08-03", event_type: "decision", event_description: "ACCC rejected public benefit application", related_phase: "public_benefit" }
                ]
            },
            {
                merger_id: "805e5280-2b2c-47e7-99ef-2032f039581b",
                title: "BankMerge with FinanceNow",
                description: "Merger of banking institutions to increase market presence and diversify product offerings.",
                acquisition_type: "shares",
                acquirer: { company_id: 9, name: "BankMerge Holdings" },
                target: { company_id: 10, name: "FinanceNow Pty Ltd" },
                status: "pending",
                notification_required: true,
                notification_date: "2025-02-20",
                effective_notification_date: null,
                is_stale: false,
                is_subject_to_conditions: false,
                markets: ["Banking", "Financial Services"],
                timeline_events: [
                    { event_id: 25, event_date: "2025-02-20", event_type: "notification", event_description: "Merger notification submitted to ACCC", related_phase: "pre-notification" },
                    { event_id: 26, event_date: "2025-02-22", event_type: "information_request", event_description: "ACCC requested additional information to complete notification", related_phase: "pre-notification" }
                ]
            }
        ],
        
        statistics: {
            summary: {
                total_notifications: 18,
                phase1_reviews: 12,
                phase2_reviews: 4,
                public_benefit_applications: 2,
                completed_reviews: 8,
                active_reviews: 10
            },
            duration: {
                average_phase1_days: 25,
                average_phase2_days: 82,
                average_public_benefit_days: 40
            },
            outcomes: {
                cleared: 6,
                cleared_with_conditions: 2,
                rejected: 2,
                withdrawn: 3,
                pending: 5
            },
            by_industry: [
                { industry: "Technology", count: 4 },
                { industry: "Retail", count: 3 },
                { industry: "Energy", count: 2 },
                { industry: "Mining", count: 2 },
                { industry: "Financial Services", count: 2 },
                { industry: "Healthcare", count: 2 },
                { industry: "Transportation", count: 1 },
                { industry: "Manufacturing", count: 1 },
                { industry: "Media", count: 1 }
            ]
        },

        companies: [
            { company_id: 1, name: "TechCorp Ltd", industry: "Technology" },
            { company_id: 2, name: "DataSystems Inc.", industry: "Technology" },
            { company_id: 3, name: "RetailCo Holdings", industry: "Retail" },
            { company_id: 4, name: "OnlineMart Pty Ltd", industry: "Retail" },
            { company_id: 5, name: "EnergyAus Limited", industry: "Energy" },
            { company_id: 6, name: "PowerGrid Networks", industry: "Energy" },
            { company_id: 7, name: "MiningCo Australia", industry: "Mining" },
            { company_id: 8, name: "ResourceExtract Ltd", industry: "Mining" },
            { company_id: 9, name: "BankMerge Holdings", industry: "Financial Services" },
            { company_id: 10, name: "FinanceNow Pty Ltd", industry: "Financial Services" }
        ],

        markets: [
            { market_id: 1, name: "Data Analytics", description: "Enterprise data analysis and business intelligence solutions" },
            { market_id: 2, name: "Business Intelligence", description: "Software for analyzing business data and reporting" },
            { market_id: 3, name: "Retail", description: "Physical retail stores and operations" },
            { market_id: 4, name: "E-commerce", description: "Online retail and marketplace platforms" },
            { market_id: 5, name: "Energy Generation", description: "Electricity generation assets and operations" },
            { market_id: 6, name: "Power Distribution", description: "Electricity distribution networks" },
            { market_id: 7, name: "Mining", description: "Extraction of mineral resources" },
            { market_id: 8, name: "Mineral Resources", description: "Processing and sale of mineral products" },
            { market_id: 9, name: "Banking", description: "Traditional banking services" },
            { market_id: 10, name: "Financial Services", description: "Broader financial products and services" }
        ]
    };

    // Function to simulate API response delay
    const simulateDelay = () => {
        return new Promise(resolve => {
            const delay = 10;
            setTimeout(resolve, delay);
        });
    };

    // Mock API functions with Promise interface
    return {
        // Get all mergers with optional filtering
        getMergers: async (filters = {}) => {
            await simulateDelay();
            
            let filteredMergers = [...mockData.mergers];
            
            // Apply filters
            if (filters.status && filters.status !== 'all') {
                filteredMergers = filteredMergers.filter(merger => merger.status === filters.status);
            }
            
            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom);
                filteredMergers = filteredMergers.filter(merger => 
                    new Date(merger.notification_date) >= fromDate
                );
            }
            
            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                filteredMergers = filteredMergers.filter(merger => 
                    new Date(merger.notification_date) <= toDate
                );
            }
            
            if (filters.industry && filters.industry !== 'all') {
                filteredMergers = filteredMergers.filter(merger => {
                    const acquirerCompany = mockData.companies.find(c => c.company_id === merger.acquirer.company_id);
                    const targetCompany = mockData.companies.find(c => c.company_id === merger.target.company_id);
                    return acquirerCompany.industry === filters.industry || targetCompany.industry === filters.industry;
                });
            }
            
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filteredMergers = filteredMergers.filter(merger => 
                    merger.title.toLowerCase().includes(searchLower) ||
                    merger.acquirer.name.toLowerCase().includes(searchLower) ||
                    merger.target.name.toLowerCase().includes(searchLower)
                );
            }
            
            return {
                data: filteredMergers,
                total: filteredMergers.length,
                page: filters.page || 1,
                pageSize: filters.pageSize || filteredMergers.length
            };
        },
        
        // Get a single merger by ID
        getMergerById: async (id) => {
            await simulateDelay();
            const merger = mockData.mergers.find(m => m.merger_id === id);
            if (!merger) {
                throw new Error('Merger not found');
            }
            return merger;
        },
        
        // Get timeline events for a merger
        getMergerTimeline: async (id) => {
            await simulateDelay();
            const merger = mockData.mergers.find(m => m.merger_id === id);
            if (!merger) {
                throw new Error('Merger not found');
            }
            return merger.timeline_events;
        },
        
        // Get summary statistics
        getStatisticsSummary: async () => {
            await simulateDelay();
            return mockData.statistics.summary;
        },
        
        // Get duration statistics
        getStatisticsDuration: async () => {
            await simulateDelay();
            return mockData.statistics.duration;
        },
        
        // Get outcome statistics
        getStatisticsOutcomes: async () => {
            await simulateDelay();
            return mockData.statistics.outcomes;
        },
        
        // Get industry statistics
        getStatisticsByIndustry: async () => {
            await simulateDelay();
            return mockData.statistics.by_industry;
        },
        
        // Get all industries
        getIndustries: async () => {
            await simulateDelay();
            const industries = [...new Set(mockData.companies.map(c => c.industry))];
            return industries;
        },
        
        // Get all markets
        getMarkets: async () => {
            await simulateDelay();
            return mockData.markets;
        },
        
        // Get recent activity (for dashboard)
        getRecentActivity: async (limit = 5) => {
            await simulateDelay();
            
            // Flatten all timeline events with merger info
            const allEvents = mockData.mergers.flatMap(merger => 
                merger.timeline_events.map(event => ({
                    ...event,
                    merger_id: merger.merger_id,
                    merger_title: merger.title
                }))
            );
            
            // Sort by date (newest first) and take the requested number
            return allEvents
                .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
                .slice(0, limit);
        },
        
        // Get upcoming deadlines (for dashboard)
        getUpcomingDeadlines: async (limit = 5) => {
            await simulateDelay();
            
            const today = new Date();
            const deadlines = [];
            
            // Collect deadlines from all mergers
            mockData.mergers.forEach(merger => {
                // Phase 1 expected end date
                if (merger.phase1 && !merger.phase1.actual_end_date) {
                    const deadlineDate = new Date(merger.phase1.expected_end_date);
                    if (deadlineDate > today) {
                        deadlines.push({
                            merger_id: merger.merger_id,
                            merger_title: merger.title,
                            type: 'Phase 1 determination',
                            deadline: merger.phase1.expected_end_date,
                            daysLeft: Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
                        });
                    }
                }
                
                // Phase 2 deadlines
                if (merger.phase2) {
                    // Competition concerns due date
                    if (!merger.phase2.competition_concerns_issued_date) {
                        const deadlineDate = new Date(merger.phase2.competition_concerns_due_date);
                        if (deadlineDate > today) {
                            deadlines.push({
                                merger_id: merger.merger_id,
                                merger_title: merger.title,
                                type: 'Competition concerns',
                                deadline: merger.phase2.competition_concerns_due_date,
                                daysLeft: Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
                            });
                        }
                    }
                    
                    // Phase 2 expected end date
                    if (!merger.phase2.actual_end_date) {
                        const deadlineDate = new Date(merger.phase2.expected_end_date);
                        if (deadlineDate > today) {
                            deadlines.push({
                                merger_id: merger.merger_id,
                                merger_title: merger.title,
                                type: 'Phase 2 determination',
                                deadline: merger.phase2.expected_end_date,
                                daysLeft: Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
                            });
                        }
                    }
                }
                
                // Public benefit deadlines
                if (merger.public_benefit) {
                    // Assessment issuance deadline
                    if (!merger.public_benefit.assessment_issued_date) {
                        const deadlineDate = new Date(merger.public_benefit.assessment_issued_date);
                        if (deadlineDate > today) {
                            deadlines.push({
                                merger_id: merger.merger_id,
                                merger_title: merger.title,
                                type: 'Public benefit assessment',
                                deadline: merger.public_benefit.assessment_issued_date,
                                daysLeft: Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
                            });
                        }
                    }
                    
                    // Determination deadline
                    if (!merger.public_benefit.actual_determination_date) {
                        const deadlineDate = new Date(merger.public_benefit.expected_determination_date);
                        if (deadlineDate > today) {
                            deadlines.push({
                                merger_id: merger.merger_id,
                                merger_title: merger.title,
                                type: 'Public benefit determination',
                                deadline: merger.public_benefit.expected_determination_date,
                                daysLeft: Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
                            });
                        }
                    }
                }
            });
            
            // Sort by days left (ascending) and take the requested number
            return deadlines
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .slice(0, limit);
        },
        
        // For future implementation when a real API is available
        getLastUpdateDate: async () => {
            await simulateDelay();
            return new Date().toISOString();
        }
    };
})();
