/**
 * router.js - Simple client-side router for the Merger Tracker application
 * Handles navigation between different pages without full page reloads
 */

const Router = (() => {
    // Available routes and their corresponding page controllers
    const routes = {
        dashboard: {
            template: 'dashboard-template',
            controller: Dashboard,
            title: 'Dashboard'
        },
        'mergers-list': {
            template: 'mergers-list-template',
            controller: MergersList,
            title: 'All Mergers'
        },
        'merger-detail': {
            template: 'merger-detail-template',
            controller: MergerDetail,
            title: 'Merger Details'
        },
        statistics: {
            template: 'statistics-template',
            controller: Statistics,
            title: 'Statistics'
        }
    };

    // Default route if none specified
    const defaultRoute = 'dashboard';
    
    // Current active route
    let currentRoute = null;
    
    // Current params from URL
    let currentParams = {};
    
    // Current controller instance
    let activeController = null;

    // Parse the current URL to determine route and params
    const parseUrl = () => {
        // Get the hash part of the URL (after #)
        let hash = window.location.hash.substring(1);
        
        // Default to the dashboard if no hash is present
        if (!hash) {
            return {
                route: defaultRoute,
                params: {}
            };
        }
        
        // Check for query parameters
        const queryIndex = hash.indexOf('?');
        let route = hash;
        let queryString = '';
        
        if (queryIndex !== -1) {
            route = hash.substring(0, queryIndex);
            queryString = hash.substring(queryIndex + 1);
        }
        
        // Parse query parameters
        const params = {};
        if (queryString) {
            const pairs = queryString.split('&');
            for (const pair of pairs) {
                const [key, value] = pair.split('=');
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        }
        
        return { route, params };
    };

    // Navigate to a new route
    const navigate = (route, params = {}) => {
        let url = '#' + route;
        
        // Add query parameters if present
        const queryParams = Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        
        if (queryParams) {
            url += '?' + queryParams;
        }
        
        window.location.hash = url;
    };

    // Update the active navigation item in the sidebar
    const updateNavigation = (route) => {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to the current route's nav item
        const navItem = document.querySelector(`.nav-item[data-page="${route}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        // Update page title
        const routeConfig = routes[route];
        if (routeConfig) {
            document.getElementById('page-title').textContent = routeConfig.title;
            document.title = `Merger Tracker - ${routeConfig.title}`;
        }
    };

    // Render the template for the current route
    const renderTemplate = (templateId) => {
        const contentContainer = document.getElementById('content-container');
        const template = document.getElementById(templateId);
        
        if (!template) {
            console.error(`Template not found: ${templateId}`);
            return;
        }
        
        // Clone the template content
        const content = template.content.cloneNode(true);
        
        // Clear the container and append the new content
        contentContainer.innerHTML = '';
        contentContainer.appendChild(content);
    };

    // Handle route changes
    const handleRouteChange = async () => {
        // Parse the current URL
        const { route, params } = parseUrl();
        
        // Get the route configuration
        const routeConfig = routes[route] || routes[defaultRoute];
        
        // Update navigation
        updateNavigation(route);
        
        // Render the template
        renderTemplate(routeConfig.template);
        
        // Clean up previous controller if exists
        if (activeController && typeof activeController.destroy === 'function') {
            activeController.destroy();
        }
        
        // Initialize the controller for the new route
        activeController = routeConfig.controller;
        if (typeof activeController.init === 'function') {
            await activeController.init(params);
        }
        
        // Update current route and params
        currentRoute = route;
        currentParams = params;
    };

    // Initialize the router
    const init = () => {
        // Listen for hash changes
        window.addEventListener('hashchange', handleRouteChange);
        
        // Handle the initial route
        handleRouteChange();
    };

    return {
        init,
        navigate,
        getCurrentRoute: () => currentRoute,
        getCurrentParams: () => ({ ...currentParams }),
        goToMergerDetail: (mergerId) => navigate('merger-detail', { id: mergerId }),
        goToMergersList: (filters = {}) => navigate('mergers-list', filters),
        goToDashboard: () => navigate('dashboard'),
        goToStatistics: (filters = {}) => navigate('statistics', filters)
    };
})();
