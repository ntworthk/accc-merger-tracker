library(plumber)
library(dplyr)
library(tidyr)
library(purrr)
library(lubridate)
library(jsonlite)
library(RSQLite)

# Create a caching environment
cache_env <- new.env(parent = emptyenv())
cache_timestamps <- new.env(parent = emptyenv())
cache_expires <- new.env(parent = emptyenv())

# Cache helper functions
# Get data from cache if available and not expired
get_from_cache <- function(cache_key) {
  if (exists(cache_key, envir = cache_env)) {
    # Check if cache has expired
    expiry_time <- cache_expires[[cache_key]]
    if (is.null(expiry_time) || Sys.time() < expiry_time) {
      message("Cache hit for: ", cache_key)
      return(cache_env[[cache_key]])
    } else {
      message("Cache expired for: ", cache_key)
      # Clean up expired cache entry
      rm(list = cache_key, envir = cache_env)
      rm(list = cache_key, envir = cache_expires)
      rm(list = cache_key, envir = cache_timestamps)
    }
  }
  message("Cache miss for: ", cache_key)
  return(NULL)
}

# Add data to cache with expiry time in seconds
add_to_cache <- function(cache_key, data, expiry_seconds = 3600) {
  cache_env[[cache_key]] <- data
  cache_timestamps[[cache_key]] <- Sys.time()
  if (!is.null(expiry_seconds)) {
    cache_expires[[cache_key]] <- Sys.time() + expiry_seconds
  }
  invisible(TRUE)
}

# Invalidate specific cache entry
invalidate_cache <- function(cache_key) {
  if (exists(cache_key, envir = cache_env)) {
    rm(list = cache_key, envir = cache_env)
    rm(list = cache_key, envir = cache_timestamps)
    rm(list = cache_key, envir = cache_expires)
    message("Invalidated cache for: ", cache_key)
    return(TRUE)
  }
  return(FALSE)
}

# Invalidate all cache entries
invalidate_all_cache <- function() {
  rm(list = ls(envir = cache_env), envir = cache_env)
  rm(list = ls(envir = cache_timestamps), envir = cache_timestamps)
  rm(list = ls(envir = cache_expires), envir = cache_expires)
  message("All cache entries invalidated")
  return(TRUE)
}

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

  allowed_origins <- c("https://ntworthk.github.io", "https://mergers.fyi")

  # Get the origin from the request
  origin <- req$HTTP_ORIGIN
  
  # Set the appropriate CORS header if the origin is allowed
  if (!is.null(origin) && origin %in% allowed_origins) {
    res$setHeader("Access-Control-Allow-Origin", origin)
  } else {
    # Default to the first allowed origin if the requesting origin is not allowed
    res$setHeader("Access-Control-Allow-Origin", allowed_origins[1])
  }

  res$setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  
  plumber::forward()
}

#* Add cache control headers to responses
#* @filter cache_headers
cache_headers <- function(req, res) {
  if (req$PATH_INFO %in% c("/mergers", "/stats")) {
    # Cache time for list of mergers
    res$setHeader("Cache-Control", "public, max-age=3600")  # 1 hour
  } else if (grepl("^/merger/", req$PATH_INFO)) {
    # Cache time for individual merger details
    res$setHeader("Cache-Control", "public, max-age=3600")  # 1 hour
  } else if (grepl("^/commencements/|^/rolling_averages", req$PATH_INFO)) {
    # Longer cache time for timeline data
    res$setHeader("Cache-Control", "public, max-age=86400")  # 24 hours
  }
  plumber::forward()
}

#* Invalidate all caches
#* @get /admin/cache/clear
#* @response 200 Cache cleared successfully
function() {
  invalidate_all_cache()
  return(list(status = "success", message = "All caches cleared successfully"))
}

#* Get all mergers with basic information
#* @get /mergers
function() {
  # Try to get from cache first
  cache_key <- "mergers_all"
  cached_data <- get_from_cache(cache_key)
  
  if (!is.null(cached_data)) {
    return(cached_data)
  }
  
  # If not in cache, get from database
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  data <- read_from_db(con)
  
  # Join decisions and details to get key information
  mergers <- data$decisions |>
    left_join(
      data$decisions_detail |>
        select(id, acquirers, targets, commenced_datetime, outcome_datetime, review_days),
      by = "id"
    ) |>
    arrange(desc(last_updated))
  
  # Cache for 1 hour (3600 seconds)
  add_to_cache(cache_key, mergers, 3600)
  
  # Return the data
  mergers
}

#* Get detailed information for a specific merger
#* @serializer unboxedJSON
#* @param merger_id The ID of the merger
#* @get /merger/<merger_id>
function(merger_id) {
  # Try to get from cache first
  cache_key <- paste0("merger_", merger_id)
  cached_data <- get_from_cache(cache_key)
  
  if (!is.null(cached_data)) {
    return(cached_data)
  }
  
  # If not in cache, get from database
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  data <- read_from_db(con)
  
  # Get basic info
  basic_info <- data$decisions |>
    filter(id == merger_id) |>
    head(1)
  
  if (nrow(basic_info) == 0) {
    return(list(error = "Merger not found"))
  }
  
  # Get detailed info
  detail_info <- data$decisions_detail |>
    filter(id == merger_id) |>
    head(1)
  
  # Combine information - prioritizing detail info for overlapping columns
  # First, identify columns that exist in both datasets
  basic_cols <- colnames(basic_info)
  detail_cols <- colnames(detail_info)
  overlapping_cols <- intersect(basic_cols, detail_cols)
  
  # Remove overlapping columns from basic_info (except id)
  cols_to_remove <- setdiff(overlapping_cols, "id")
  basic_info_filtered <- basic_info |>
    select(-all_of(cols_to_remove))
  
  # Now combine the filtered basic info with the full detail info
  merger_info <- basic_info_filtered |>
    left_join(detail_info, by = "id")
  
  # Cache for 1 hour (3600 seconds)
  add_to_cache(cache_key, merger_info, 3600)
  
  # Return the data
  merger_info
}

#* Get statistics about mergers
#* @get /stats
function() {
  # Try to get from cache first
  cache_key <- "merger_stats"
  cached_data <- get_from_cache(cache_key)
  
  if (!is.null(cached_data)) {
    return(cached_data)
  }
  
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
  
  # Top industries - handle mixed types
  # First ensure industry is always a list
  industries <- tryCatch({
    # Safely process industries by first ensuring all values are proper lists
    safe_industries <- data$decisions |>
      # Drop rows with NULL or NA industry
      filter(!is.null(industry)) |>
      # Ensure each industry value is a list
      mutate(
        industry = purrr::map(industry, function(ind) {
          if(is.null(ind) || length(ind) == 0) {
            return(character(0))
          } else if(is.character(ind)) {
            return(ind)
          } else if(is.list(ind)) {
            # Extract character values from the list
            ind_chars <- unlist(ind)
            if(is.character(ind_chars)) {
              return(ind_chars)
            } else {
              return(character(0))
            }
          } else {
            return(character(0))
          }
        })
      )
    
    # Now safely extract and count industries
    result <- safe_industries |>
      # Explode the list column - each industry value gets a row
      unnest_longer(industry) |>
      # Count occurrences
      count(industry, sort = TRUE, name = "count") |>
      # Clean up the results
      filter(!is.na(industry), industry != "")
    
    # Return the result (or empty tibble if failed)
    result
  }, error = function(e) {
    # If still failing, return empty results rather than error
    message("Error processing industries: ", e$message)
    return(tibble(industry = character(), count = integer()))
  })
  
  # Combine all statistics
  stats_data <- list(
    total_mergers = total_mergers,
    avg_review_days = avg_review_days,
    ongoing_mergers = ongoing_mergers,
    outcomes = outcomes,
    industries = industries
  )
  
  # Cache for 1 hour (3600 seconds)
  add_to_cache(cache_key, stats_data, 3600)
  
  # Return the data
  stats_data
}

#* Get merger commencements by day
#* @get /commencements/day
function() {
  # Try to get from cache first
  cache_key <- "commencements_day"
  cached_data <- get_from_cache(cache_key)
  
  if (!is.null(cached_data)) {
    return(cached_data)
  }
  
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
  
  # Cache for 24 hours (86400 seconds)
  add_to_cache(cache_key, result, 86400)
  
  result
}

#* Get merger commencements by month
#* @get /commencements/month
function() {
  # Try to get from cache first
  cache_key <- "commencements_month"
  cached_data <- get_from_cache(cache_key)
  
  if (!is.null(cached_data)) {
    return(cached_data)
  }
  
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
  
  # Cache for 24 hours (86400 seconds)
  add_to_cache(cache_key, result, 86400)
  
  result
}

#* Get merger commencements by year
#* @get /commencements/year
function() {
  # Try to get from cache first
  cache_key <- "commencements_year"
  cached_data <- get_from_cache(cache_key)
  
  if (!is.null(cached_data)) {
    return(cached_data)
  }
  
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
  
  # Cache for 24 hours (86400 seconds)
  add_to_cache(cache_key, result, 86400)
  
  result
}

#* Calculate rolling sums of merger commencements
#* @get /rolling_averages
function() {
  # Try to get from cache first
  cache_key <- "rolling_averages"
  cached_data <- get_from_cache(cache_key)
  
  if (!is.null(cached_data)) {
    return(cached_data)
  }
  
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
  
  # Cache for 24 hours (86400 seconds)
  add_to_cache(cache_key, result, 86400)
  
  result
}

#* Cache status information
#* @get /admin/cache/status
function() {
  cache_keys <- ls(envir = cache_env)
  cache_info <- list()
  
  for (key in cache_keys) {
    cache_info[[key]] <- list(
      created = as.character(cache_timestamps[[key]]),
      expires = if (!is.null(cache_expires[[key]])) 
        as.character(cache_expires[[key]]) else "never",
      expires_in_seconds = if (!is.null(cache_expires[[key]])) 
        as.numeric(difftime(cache_expires[[key]], Sys.time(), units = "secs")) else NA
    )
  }
  
  list(
    cache_entries = length(cache_keys),
    cache_keys = cache_keys,
    cache_info = cache_info
  )
}

#* Get upcoming events from all mergers
#* @serializer unboxedJSON
#* @get /upcoming_events
function() {
  # Try to get from cache first
  cache_key <- "upcoming_events"
  cached_data <- get_from_cache(cache_key)
  
  if (!is.null(cached_data)) {
    return(cached_data)
  }
  
  # Get database connection
  con <- connect_db()
  on.exit(dbDisconnect(con))
  
  # Read data from database
  data <- read_from_db(con)
  
  # Get current date
  current_date <- Sys.Date()
  
  # Process each merger and extract upcoming events
  result <- data$decisions %>%
    # Join with details
    left_join(data$decisions_detail, by = "id") %>%
    # Filter out mergers without timeline
    filter(!is.null(timeline), lengths(timeline) > 0) %>%
    unnest(timeline) %>%
    mutate(time = ymd_hms(time)) %>%
    filter(time > current_date) %>%
    select(
      merger_id = id,
      merger_title = title,
      merger_link = link,
      event_date = time,
      Event = Event,
      Description = description
    ) |>
    # Sort by event date
    arrange(event_date)
  
  # If no events, return empty tibble
  if (nrow(result) == 0) {
    result <- tibble(
      merger_id = character(),
      merger_title = character(),
      merger_link = character(),
      event_date = as.Date(character()),
      Event = character(),
      Description = character()
    )
  }
  
  # Cache for 1 hour (3600 seconds)
  add_to_cache(cache_key, result, 3600)
  
  # Return the result
  result
}

#* @assets ./static
list()

# Start the API server
# plumber::plumb("plumber.R")$run(host = "0.0.0.0", port = 8000)
