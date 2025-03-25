library(plumber)
library(dplyr)
library(tidyr)
library(purrr)
library(lubridate)
library(jsonlite)
library(RSQLite)

# Helper function to read data from db
read_from_db <- function(con) {
  decisions <- dbReadTable(con, "decisions") |>
    as_tibble() |>
    mutate(
      industry = map(industry, ~fromJSON(.x)),
      last_updated = ymd_hms(last_updated)
    )
  
  decisions_detail <- dbReadTable(con, "decisions_detail") |>
    as_tibble() |>
    mutate(
      # Explicitly convert review_days to integer with proper NA handling
      review_days = as.integer(review_days),
      acquirers = map(acquirers, ~fromJSON(.x)),
      targets = map(targets, ~fromJSON(.x)),
      timeline = map(timeline, ~fromJSON(.x)),
      last_updated = ymd_hms(last_updated)
    )
  
  list(
    decisions = decisions,
    decisions_detail = decisions_detail
  )
}

# Helper function to connect to database
connect_db <- function(db_path = "data/accc_mergers.sqlite") {
  dbConnect(SQLite(), db_path)
}

#* @apiTitle ACCC Mergers API
#* @apiDescription API for accessing ACCC informal merger reviews data

#* Enable CORS
#* @filter cors
cors <- function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "https://ntworthk.github.io")
  res$setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  
  plumber::forward()
}

#* Get all mergers with basic information
#* @get /mergers
function() {
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  data <- read_from_db(con)
  
  # Join decisions and details to get key information
  mergers <- data$decisions |>
    left_join(
      data$decisions_detail |>
        select(id, acquirers, targets),
      by = "id"
    ) |>
    arrange(desc(last_updated))
  
  # Convert to list for JSON serialization
  mergers
}

#* Get detailed information for a specific merger
#* @param id The ID of the merger
#* @get /merger/<id>
function(id) {
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  data <- read_from_db(con)
  
  # Get basic info
  basic_info <- data$decisions |>
    filter(id == id) |>
    head(1)
  
  if (nrow(basic_info) == 0) {
    return(list(error = "Merger not found"))
  }
  
  # Get detailed info
  detail_info <- data$decisions_detail |>
    filter(id == id) |>
    head(1)
  
  # Combine information
  merger_info <- basic_info |>
    select(-last_updated) |>
    bind_cols(
      detail_info |> 
        select(-id) # Avoid duplicate id column
    )
  
  # Convert to list for JSON serialization
  merger_info
}

#* Get statistics about mergers
#* @get /stats
function() {
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  data <- read_from_db(con)
  
  # Calculate basic statistics
  total_mergers <- nrow(data$decisions)
  
  # Calculate average review days (for completed reviews)
  avg_review_days <- data$decisions_detail |>
    filter(!is.na(review_days), 
           !is.na(outcome_datetime)) |>
    summarise(avg = mean(review_days, na.rm = TRUE)) |>
    pull(avg)
  
  # Count ongoing mergers
  ongoing_mergers <- data$decisions |>
    filter(grepl("ongoing|commenced|phase|review|under consideration", 
                 status, ignore.case = TRUE)) |>
    nrow()
  
  # Outcomes breakdown
  outcomes <- data$decisions |>
    filter(!is.na(outcome)) |>
    count(outcome, sort = TRUE, name = "count")
  
  # Top industries
  # First, unnest the industry lists
  industries <- data$decisions |>
    select(id, industry) |>
    unnest(industry) |>
    count(industry, sort = TRUE, name = "count") |>
    filter(!is.na(industry), industry != "")
  
  # Combine all statistics
  list(
    total_mergers = total_mergers,
    avg_review_days = avg_review_days,
    ongoing_mergers = ongoing_mergers,
    outcomes = outcomes,
    industries = industries
  )
}

#* Get merger commencements by day
#* @get /commencements/day
function() {
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  # Read data
  db_data <- read_from_db(con)
  decisions_detail <- db_data$decisions_detail
  
  # Extract commencement dates
  decisions_detail <- decisions_detail |>
    mutate(
      commenced_date = if_else(
        !is.na(commenced_datetime),
        as_date(ymd_hms(commenced_datetime)),
        NA_Date_
      )
    )
  
  # Get valid commencement dates (not NA)
  valid_dates <- decisions_detail |>
    filter(!is.na(commenced_date))
  
  # Handle empty datasets
  if (nrow(valid_dates) == 0) {
    return(tibble(period_start = as.Date(character()), count = integer()))
  }
  
  # Determine date range
  min_date <- min(valid_dates$commenced_date)
  max_date <- max(valid_dates$last_updated) |> as_date()
  
  # Floor dates to day
  min_period <- floor_date(min_date, "day")
  max_period <- floor_date(max_date, "day")
  
  # Create a sequence of daily dates
  period_sequence <- tibble(period_start = seq.Date(min_period, max_period, by = "day"))
  
  # Count by day
  period_counts <- valid_dates |>
    mutate(period_start = floor_date(commenced_date, "day")) |>
    count(period_start, name = "count")
  
  # Join the period sequence with the counts
  result <- period_sequence |>
    left_join(period_counts, by = "period_start") |>
    mutate(count = replace_na(count, 0))
  
  result
}

#* Get merger commencements by month
#* @get /commencements/month
function() {
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  # Read data
  db_data <- read_from_db(con)
  decisions_detail <- db_data$decisions_detail
  
  # Extract commencement dates
  decisions_detail <- decisions_detail |>
    mutate(
      commenced_date = if_else(
        !is.na(commenced_datetime),
        as_date(ymd_hms(commenced_datetime)),
        NA_Date_
      )
    )
  
  # Get valid commencement dates (not NA)
  valid_dates <- decisions_detail |>
    filter(!is.na(commenced_date))
  
  # Handle empty datasets
  if (nrow(valid_dates) == 0) {
    return(tibble(period_start = as.Date(character()), count = integer()))
  }
  
  # Determine date range
  min_date <- min(valid_dates$commenced_date)
  max_date <- max(valid_dates$last_updated) |> as_date()
  
  # Floor dates to month
  min_period <- floor_date(min_date, "month")
  max_period <- floor_date(max_date, "month")
  
  # Create a sequence of monthly dates
  period_sequence <- tibble(period_start = seq.Date(min_period, max_period, by = "month"))
  
  # Count by month
  period_counts <- valid_dates |>
    mutate(period_start = floor_date(commenced_date, "month")) |>
    count(period_start, name = "count")
  
  # Join the period sequence with the counts
  result <- period_sequence |>
    left_join(period_counts, by = "period_start") |>
    mutate(count = replace_na(count, 0))
  
  result
}

#* Get merger commencements by year
#* @get /commencements/year
function() {
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  # Read data
  db_data <- read_from_db(con)
  decisions_detail <- db_data$decisions_detail
  
  # Extract commencement dates
  decisions_detail <- decisions_detail |>
    mutate(
      commenced_date = if_else(
        !is.na(commenced_datetime),
        as_date(ymd_hms(commenced_datetime)),
        NA_Date_
      )
    )
  
  # Get valid commencement dates (not NA)
  valid_dates <- decisions_detail |>
    filter(!is.na(commenced_date))
  
  # Handle empty datasets
  if (nrow(valid_dates) == 0) {
    return(tibble(period_start = as.Date(character()), count = integer()))
  }
  
  # Determine date range
  min_date <- min(valid_dates$commenced_date)
  max_date <- max(valid_dates$last_updated) |> as_date()
  
  # Floor dates to year
  min_period <- floor_date(min_date, "year")
  max_period <- floor_date(max_date, "year")
  
  # Create a sequence of yearly dates
  period_sequence <- tibble(period_start = seq.Date(min_period, max_period, by = "year"))
  
  # Count by year
  period_counts <- valid_dates |>
    mutate(period_start = floor_date(commenced_date, "year")) |>
    count(period_start, name = "count")
  
  # Join the period sequence with the counts
  result <- period_sequence |>
    left_join(period_counts, by = "period_start") |>
    mutate(count = replace_na(count, 0))
  
  result
}

#* Calculate rolling sums of merger commencements
#* @get /rolling_averages
function() {
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  # Get daily counts first
  daily_counts <- GET("/commencements/day")
  
  # Rename column for clarity
  daily_counts <- daily_counts |>
    rename(date = period_start)
  
  # Ensure data is sorted by date
  daily_counts <- daily_counts |>
    arrange(date)
  
  # Calculate rolling sums
  library(slider)
  
  # Calculate rolling sums for exact day periods
  result <- daily_counts |>
    mutate(
      # 30-day rolling sum (approximately 1 month)
      rolling_30d = slider::slide_dbl(
        .x = count,
        .f = ~sum(.x, na.rm = TRUE),
        .before = 29,
        .after = 0
      ),
      
      # 90-day rolling sum (approximately 3 months)
      rolling_90d = slider::slide_dbl(
        .x = count,
        .f = ~sum(.x, na.rm = TRUE),
        .before = 89,
        .after = 0
      ),
      
      # 365-day rolling sum (approximately 12 months)
      rolling_365d = slider::slide_dbl(
        .x = count,
        .f = ~sum(.x, na.rm = TRUE),
        .before = 364,
        .after = 0
      )
    )
  
  # To avoid too many data points, sample data for longer timeframes
  if (nrow(result) > 365) {
    result <- result |>
      filter(row_number() %% 7 == 0) # Weekly sampling
  }
  
  result
}

#* @assets ./static
list()

# Start the API server
# plumber::plumb("plumber.R")$run(host = "0.0.0.0", port = 8000)