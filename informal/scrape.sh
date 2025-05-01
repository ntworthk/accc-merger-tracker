#!/bin/bash

# scrape.sh
# Script to run the ACCC merger scraper in update mode

echo "Starting ACCC Merger Scraper in 'update' mode..."
Rscript -e "source('generate_database.R'); run_accc_scraper(mode = 'update')"

# Check the exit status
if [ $? -eq 0 ]; then
    echo "Scraper completed successfully!"
else
    echo "Error: Scraper failed to complete. Check the output above for details."
    exit 1
fi

echo "Done"