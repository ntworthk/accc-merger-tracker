# ACCC Mergers Tracker

A simple client-side web application for tracking and visualising ACCC merger decisions in Australia.

## Features

- View all ACCC merger decisions with filtering capabilities
- Statistical dashboard showing trends and summaries
- Timeline visualisations of merger commencements
- Detailed view of individual merger information

## Project Structure

```
accc-mergers-tracker/
├── index.html        # Main HTML file
├── styles.css        # CSS styles
├── app.js            # JavaScript functionality
├── plumber.R         # R Plumber API for data access
└── README.md         # This file
```

## Setup Instructions

### Setting up the API

1. Install required R packages:
   ```r
   install.packages(c("plumber", "dplyr", "tidyr", "lubridate", "jsonlite", "RSQLite"))
   ```

2. Place the `plumber.R` file in your project directory

3. Start the API server:
   ```r
   library(plumber)
   plumber::plumb("plumber.R")$run(host = "0.0.0.0", port = 8000)
   ```

### Setting up the web app

1. Clone or download this repository to your local machine or hosting environment
2. Open `app.js` and update the `API_BASE_URL` variable to match your API endpoint if needed
3. Host the files on GitHub Pages or any web server

For GitHub Pages:
1. Create a new repository on GitHub
2. Push all the files to that repository
3. Enable GitHub Pages in the repository settings
4. Your app will be available at `https://[username].github.io/[repository-name]/`

## Customisation

- Update the colour scheme by modifying CSS variables in `styles.css`
- Adjust the page size by changing `itemsPerPage` in `app.js`
- Modify chart types and options in the chart rendering functions

## API Endpoints

The R Plumber API exposes the following endpoints:

- `GET /mergers` - Get all mergers with basic information
- `GET /merger/:id` - Get detailed information for a specific merger
- `GET /stats` - Get statistical summaries about the mergers
- `GET /commencements/day` - Get daily merger commencement counts
- `GET /commencements/month` - Get monthly merger commencement counts
- `GET /commencements/year` - Get yearly merger commencement counts
- `GET /rolling_averages` - Get rolling averages of merger commencements

## Dependencies

- [Chart.js](https://www.chartjs.org/) (3.9.1) - For data visualisation
- R packages:
  - plumber - For API creation
  - dplyr - For data manipulation
  - tidyr - For data tidying
  - lubridate - For date handling
  - jsonlite - For JSON parsing
  - RSQLite - For database access

## Browser Support

The application is compatible with modern browsers including:
- Chrome
- Firefox
- Safari
- Edge

## License

This project is open-source and available for use and modification.