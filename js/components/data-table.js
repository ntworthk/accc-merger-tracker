/**
 * data-table.js - Reusable data table component for the Merger Tracker application
 * Provides sortable, filterable tables with pagination
 */

const DataTable = (() => {
    // Table instances
    const tables = {};
    
    // Create a new data table
    const createTable = (containerId, options = {}) => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element not found: ${containerId}`);
            return null;
        }
        
        // Default options
        const defaultOptions = {
            columns: [],
            data: [],
            pageSize: 10,
            pageSizeOptions: [5, 10, 25, 50, 100],
            sortable: true,
            filterable: true,
            pagination: true,
            selectable: false,
            expandable: false,
            responsive: true,
            onRowClick: null,
            emptyMessage: 'No data available',
            loadingMessage: 'Loading data...',
            rowClassFunction: null,
            initialSort: {
                column: null,
                direction: 'asc'
            }
        };
        
        // Merge default options with provided options
        const tableOptions = { ...defaultOptions, ...options };
        
        // Create table instance
        const tableInstance = {
            id: containerId,
            options: tableOptions,
            currentPage: 1,
            currentSort: tableOptions.initialSort,
            currentFilter: '',
            selectedRows: [],
            expandedRows: [],
            totalPages: 1,
            filteredData: [...tableOptions.data],
            
            // Initialize table
            init: function() {
                this.render();
                this.setupEventListeners();
                return this;
            },
            
            // Render the table
            render: function() {
                // Calculate total pages
                this.totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
                
                // Generate table HTML
                let html = '';
                
                // Add search bar if filterable
                if (this.options.filterable) {
                    html += `
                        <div class="data-table-filter">
                            <div class="search-container">
                                <input type="text" id="${this.id}-filter" class="filter-input" placeholder="Search...">
                                <button class="filter-button" id="${this.id}-filter-button">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }
                
                // Add table
                html += `<div class="data-table-container ${this.options.responsive ? 'responsive' : ''}">`;
                html += `<table class="data-table" id="${this.id}-table">`;
                
                // Add header
                html += '<thead><tr>';
                
                // Add select all checkbox if selectable
                if (this.options.selectable) {
                    html += '<th class="select-column"><input type="checkbox" id="${this.id}-select-all"></th>';
                }
                
                // Add expand column if expandable
                if (this.options.expandable) {
                    html += '<th class="expand-column"></th>';
                }
                
                // Add column headers
                this.options.columns.forEach(column => {
                    const isSortable = this.options.sortable && column.sortable !== false;
                    const isCurrentSortColumn = this.currentSort.column === column.field;
                    
                    html += `<th 
                        ${isSortable ? 'class="sortable-header"' : ''} 
                        data-field="${column.field}" 
                        ${column.width ? `style="width: ${column.width}"` : ''}>
                        ${column.title}
                        ${isSortable ? `<span class="sort-icon">
                            ${isCurrentSortColumn ? 
                                `<i class="fas fa-sort-${this.currentSort.direction === 'asc' ? 'up' : 'down'}"></i>` : 
                                '<i class="fas fa-sort"></i>'}
                        </span>` : ''}
                    </th>`;
                });
                
                html += '</tr></thead>';
                
                // Add body
                html += '<tbody>';
                
                // If loading
                if (this.options.loading) {
                    html += `<tr><td colspan="${this.options.columns.length + (this.options.selectable ? 1 : 0) + (this.options.expandable ? 1 : 0)}" class="no-data">${this.options.loadingMessage}</td></tr>`;
                } 
                // If no data
                else if (this.filteredData.length === 0) {
                    html += `<tr><td colspan="${this.options.columns.length + (this.options.selectable ? 1 : 0) + (this.options.expandable ? 1 : 0)}" class="no-data">${this.options.emptyMessage}</td></tr>`;
                } 
                // Add rows
                else {
                    // Get current page data
                    const startIndex = (this.currentPage - 1) * this.options.pageSize;
                    const endIndex = startIndex + this.options.pageSize;
                    const pageData = this.filteredData.slice(startIndex, endIndex);
                    
                    // Add rows
                    pageData.forEach((row, rowIndex) => {
                        const isSelected = this.selectedRows.includes(row.id || rowIndex);
                        const isExpanded = this.expandedRows.includes(row.id || rowIndex);
                        const rowClass = this.options.rowClassFunction ? this.options.rowClassFunction(row) : '';
                        
                        html += `<tr class="${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''} ${rowClass}" data-row-id="${row.id || rowIndex}">`;
                        
                        // Add select checkbox if selectable
                        if (this.options.selectable) {
                            html += `<td class="select-column"><input type="checkbox" ${isSelected ? 'checked' : ''} class="row-checkbox"></td>`;
                        }
                        
                        // Add expand button if expandable
                        if (this.options.expandable) {
                            html += `<td class="expand-column"><button class="expand-button"><i class="fas fa-${isExpanded ? 'minus' : 'plus'}-circle"></i></button></td>`;
                        }
                        
                        // Add cells
                        this.options.columns.forEach(column => {
                            const cellValue = column.render ? column.render(row[column.field], row) : row[column.field];
                            html += `<td ${column.className ? `class="${column.className}"` : ''}>${cellValue !== undefined ? cellValue : ''}</td>`;
                        });
                        
                        html += '</tr>';
                        
                        // Add expanded row if expanded
                        if (this.options.expandable && isExpanded) {
                            const colSpan = this.options.columns.length + (this.options.selectable ? 1 : 0) + (this.options.expandable ? 1 : 0);
                            const expandedContent = this.options.renderExpanded ? this.options.renderExpanded(row) : JSON.stringify(row);
                            
                            html += `
                                <tr class="row-details-row">
                                    <td colspan="${colSpan}" class="row-details">
                                        <div class="row-details-content">
                                            ${expandedContent}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }
                    });
                }
                
                html += '</tbody>';
                html += '</table>';
                html += '</div>';
                
                // Add pagination if enabled
                if (this.options.pagination && this.filteredData.length > 0) {
                    html += `
                        <div class="data-table-pagination">
                            <div class="pagination-controls">
                                <button class="pagination-btn" id="${this.id}-first-page" ${this.currentPage === 1 ? 'disabled' : ''}>
                                    <i class="fas fa-angle-double-left"></i>
                                </button>
                                <button class="pagination-btn" id="${this.id}-prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>
                                    <i class="fas fa-angle-left"></i>
                                </button>
                                <span id="${this.id}-page-info">Page ${this.currentPage} of ${this.totalPages}</span>
                                <button class="pagination-btn" id="${this.id}-next-page" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                                    <i class="fas fa-angle-right"></i>
                                </button>
                                <button class="pagination-btn" id="${this.id}-last-page" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                                    <i class="fas fa-angle-double-right"></i>
                                </button>
                            </div>
                            <div class="page-size-selector">
                                <span>Rows per page:</span>
                                <select id="${this.id}-page-size">
                                    ${this.options.pageSizeOptions.map(size => 
                                        `<option value="${size}" ${this.options.pageSize === size ? 'selected' : ''}>${size}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                    `;
                }
                
                // Update container
                container.innerHTML = html;
            },
            
            // Set up event listeners
            setupEventListeners: function() {
                const table = document.getElementById(`${this.id}-table`);
                
                // Row click handler
                if (table && this.options.onRowClick) {
                    table.addEventListener('click', (e) => {
                        const row = e.target.closest('tr');
                        if (row && row.dataset.rowId !== undefined) {
                            // Skip if click was on checkbox or expand button
                            if (e.target.closest('.row-checkbox') || e.target.closest('.expand-button')) {
                                return;
                            }
                            
                            const rowId = row.dataset.rowId;
                            const rowData = this.filteredData.find((data, index) => 
                                (data.id || index).toString() === rowId
                            );
                            
                            this.options.onRowClick(rowData, row);
                        }
                    });
                }
                
                // Sort handler
                if (this.options.sortable) {
                    const headers = document.querySelectorAll(`#${this.id}-table th.sortable-header`);
                    headers.forEach(header => {
                        header.addEventListener('click', () => {
                            const field = header.dataset.field;
                            
                            // Toggle sort direction if already sorted on this column
                            if (this.currentSort.column === field) {
                                this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                            } else {
                                this.currentSort.column = field;
                                this.currentSort.direction = 'asc';
                            }
                            
                            this.sortData();
                            this.currentPage = 1;
                            this.render();
                            this.setupEventListeners();
                        });
                    });
                }
                
                // Filter handler
                if (this.options.filterable) {
                    const filterInput = document.getElementById(`${this.id}-filter`);
                    const filterButton = document.getElementById(`${this.id}-filter-button`);
                    
                    if (filterInput) {
                        filterInput.addEventListener('keyup', (e) => {
                            if (e.key === 'Enter') {
                                this.currentFilter = filterInput.value.toLowerCase();
                                this.filterData();
                                this.currentPage = 1;
                                this.render();
                                this.setupEventListeners();
                            }
                        });
                    }
                    
                    if (filterButton) {
                        filterButton.addEventListener('click', () => {
                            if (filterInput) {
                                this.currentFilter = filterInput.value.toLowerCase();
                                this.filterData();
                                this.currentPage = 1;
                                this.render();
                                this.setupEventListeners();
                            }
                        });
                    }
                }
                
                // Pagination handlers
                if (this.options.pagination) {
                    const firstPageBtn = document.getElementById(`${this.id}-first-page`);
                    const prevPageBtn = document.getElementById(`${this.id}-prev-page`);
                    const nextPageBtn = document.getElementById(`${this.id}-next-page`);
                    const lastPageBtn = document.getElementById(`${this.id}-last-page`);
                    const pageSizeSelect = document.getElementById(`${this.id}-page-size`);
                    
                    if (firstPageBtn) {
                        firstPageBtn.addEventListener('click', () => {
                            if (this.currentPage > 1) {
                                this.currentPage = 1;
                                this.render();
                                this.setupEventListeners();
                            }
                        });
                    }
                    
                    if (prevPageBtn) {
                        prevPageBtn.addEventListener('click', () => {
                            if (this.currentPage > 1) {
                                this.currentPage--;
                                this.render();
                                this.setupEventListeners();
                            }
                        });
                    }
                    
                    if (nextPageBtn) {
                        nextPageBtn.addEventListener('click', () => {
                            if (this.currentPage < this.totalPages) {
                                this.currentPage++;
                                this.render();
                                this.setupEventListeners();
                            }
                        });
                    }
                    
                    if (lastPageBtn) {
                        lastPageBtn.addEventListener('click', () => {
                            if (this.currentPage < this.totalPages) {
                                this.currentPage = this.totalPages;
                                this.render();
                                this.setupEventListeners();
                            }
                        });
                    }
                    
                    if (pageSizeSelect) {
                        pageSizeSelect.addEventListener('change', () => {
                            this.options.pageSize = parseInt(pageSizeSelect.value);
                            this.currentPage = 1;
                            this.totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
                            this.render();
                            this.setupEventListeners();
                        });
                    }
                }
                
                // Selection handlers
                if (this.options.selectable) {
                    const selectAllCheckbox = document.getElementById(`${this.id}-select-all`);
                    const rowCheckboxes = document.querySelectorAll(`#${this.id}-table .row-checkbox`);
                    
                    if (selectAllCheckbox) {
                        selectAllCheckbox.addEventListener('change', () => {
                            const isChecked = selectAllCheckbox.checked;
                            
                            rowCheckboxes.forEach(checkbox => {
                                checkbox.checked = isChecked;
                            });
                            
                            // Get current page data
                            const startIndex = (this.currentPage - 1) * this.options.pageSize;
                            const endIndex = startIndex + this.options.pageSize;
                            const pageData = this.filteredData.slice(startIndex, endIndex);
                            
                            if (isChecked) {
                                // Add all current page rows to selection
                                pageData.forEach((row, index) => {
                                    const rowId = row.id || (startIndex + index);
                                    if (!this.selectedRows.includes(rowId)) {
                                        this.selectedRows.push(rowId);
                                    }
                                });
                            } else {
                                // Remove all current page rows from selection
                                pageData.forEach((row, index) => {
                                    const rowId = row.id || (startIndex + index);
                                    const rowIndex = this.selectedRows.indexOf(rowId);
                                    if (rowIndex !== -1) {
                                        this.selectedRows.splice(rowIndex, 1);
                                    }
                                });
                            }
                            
                            // Trigger selection change callback
                            if (this.options.onSelectionChange) {
                                this.options.onSelectionChange(this.selectedRows, this.getSelectedData());
                            }
                        });
                    }
                    
                    rowCheckboxes.forEach(checkbox => {
                        checkbox.addEventListener('change', () => {
                            const row = checkbox.closest('tr');
                            const rowId = parseInt(row.dataset.rowId);
                            
                            if (checkbox.checked) {
                                if (!this.selectedRows.includes(rowId)) {
                                    this.selectedRows.push(rowId);
                                }
                            } else {
                                const rowIndex = this.selectedRows.indexOf(rowId);
                                if (rowIndex !== -1) {
                                    this.selectedRows.splice(rowIndex, 1);
                                }
                            }
                            
                            // Update select all checkbox state
                            if (selectAllCheckbox) {
                                const allChecked = rowCheckboxes.length > 0 && 
                                    Array.from(rowCheckboxes).every(cb => cb.checked);
                                
                                selectAllCheckbox.checked = allChecked;
                                selectAllCheckbox.indeterminate = !allChecked && 
                                    Array.from(rowCheckboxes).some(cb => cb.checked);
                            }
                            
                            // Trigger selection change callback
                            if (this.options.onSelectionChange) {
                                this.options.onSelectionChange(this.selectedRows, this.getSelectedData());
                            }
                        });
                    });
                }
                
                // Expand handlers
                if (this.options.expandable) {
                    const expandButtons = document.querySelectorAll(`#${this.id}-table .expand-button`);
                    
                    expandButtons.forEach(button => {
                        button.addEventListener('click', () => {
                            const row = button.closest('tr');
                            const rowId = parseInt(row.dataset.rowId);
                            
                            const expandedIndex = this.expandedRows.indexOf(rowId);
                            if (expandedIndex === -1) {
                                this.expandedRows.push(rowId);
                            } else {
                                this.expandedRows.splice(expandedIndex, 1);
                            }
                            
                            this.render();
                            this.setupEventListeners();
                        });
                    });
                }
            },
            
            // Sort data based on current sort
            sortData: function() {
                if (!this.currentSort.column) return;
                
                const column = this.options.columns.find(col => col.field === this.currentSort.column);
                
                this.filteredData.sort((a, b) => {
                    let valueA = a[this.currentSort.column];
                    let valueB = b[this.currentSort.column];
                    
                    // Use sorter function if provided
                    if (column && column.sorter) {
                        return column.sorter(valueA, valueB, a, b) * (this.currentSort.direction === 'asc' ? 1 : -1);
                    }
                    
                    // Default sort
                    if (valueA === null || valueA === undefined) valueA = '';
                    if (valueB === null || valueB === undefined) valueB = '';
                    
                    // Convert to strings for comparison
                    valueA = valueA.toString().toLowerCase();
                    valueB = valueB.toString().toLowerCase();
                    
                    // Compare
                    if (valueA < valueB) {
                        return this.currentSort.direction === 'asc' ? -1 : 1;
                    }
                    if (valueA > valueB) {
                        return this.currentSort.direction === 'asc' ? 1 : -1;
                    }
                    return 0;
                });
            },
            
            // Filter data based on current filter
            filterData: function() {
                if (!this.currentFilter) {
                    this.filteredData = [...this.options.data];
                } else {
                    this.filteredData = this.options.data.filter(row => {
                        return this.options.columns.some(column => {
                            // Skip columns marked as not filterable
                            if (column.filterable === false) return false;
                            
                            const value = row[column.field];
                            if (value === null || value === undefined) return false;
                            
                            return value.toString().toLowerCase().includes(this.currentFilter);
                        });
                    });
                }
                
                // Re-apply sort
                if (this.currentSort.column) {
                    this.sortData();
                }
                
                // Update total pages
                this.totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
                
                // Adjust current page if out of bounds
                if (this.currentPage > this.totalPages) {
                    this.currentPage = Math.max(1, this.totalPages);
                }
            },
            
            // Get selected row data
            getSelectedData: function() {
                return this.selectedRows.map(rowId => {
                    return this.options.data.find((row, index) => (row.id || index) === rowId);
                }).filter(Boolean);
            },
            
            // Update table data
            updateData: function(newData) {
                this.options.data = newData;
                this.filterData();
                this.render();
                this.setupEventListeners();
                return this;
            },
            
            // Update loading state
            setLoading: function(isLoading) {
                this.options.loading = isLoading;
                this.render();
                this.setupEventListeners();
                return this;
            },
            
            // Update table options
            updateOptions: function(newOptions) {
                this.options = { ...this.options, ...newOptions };
                this.filterData();
                this.render();
                this.setupEventListeners();
                return this;
            },
            
            // Set selected rows
            setSelectedRows: function(rowIds) {
                this.selectedRows = rowIds;
                this.render();
                this.setupEventListeners();
                return this;
            },
            
            // Clear selected rows
            clearSelection: function() {
                this.selectedRows = [];
                this.render();
                this.setupEventListeners();
                return this;
            },
            
            // Export table data to CSV
            exportToCSV: function(filename) {
                const exportData = this.filteredData.map(row => {
                    const obj = {};
                    this.options.columns.forEach(column => {
                        if (column.export !== false) {
                            const value = column.exportValue ? 
                                column.exportValue(row[column.field], row) : 
                                row[column.field];
                            
                            obj[column.title || column.field] = value;
                        }
                    });
                    return obj;
                });
                
                if (exportData.length === 0) {
                    console.error('No data to export');
                    return;
                }
                
                // Convert to CSV
                const headers = Object.keys(exportData[0]);
                const csvRows = [
                    headers.join(','),
                    ...exportData.map(row => 
                        headers.map(header => {
                            const value = row[header];
                            
                            // Handle nulls and undefined
                            if (value === null || value === undefined) {
                                return '';
                            }
                            
                            // Handle strings with commas and quotes
                            if (typeof value === 'string') {
                                return `"${value.replace(/"/g, '""')}"`;
                            }
                            
                            return value;
                        }).join(',')
                    )
                ];
                
                const csvString = csvRows.join('\n');
                
                // Download CSV
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', filename || 'export.csv');
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                return this;
            }
        };
        
        // Save table instance
        tables[containerId] = tableInstance;
        
        // Initialize table
        return tableInstance.init();
    };
    
    // Get table instance by ID
    const getTable = (id) => {
        return tables[id] || null;
    };
    
    // Check if a table exists
    const hasTable = (id) => {
        return tables[id] !== undefined;
    };
    
    // Destroy table
    const destroyTable = (id) => {
        if (tables[id]) {
            document.getElementById(id).innerHTML = '';
            delete tables[id];
            return true;
        }
        return false;
    };
    
    return {
        createTable,
        getTable,
        hasTable,
        destroyTable
    };
})();