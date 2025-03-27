library(tidyverse)
library(httr)
library(rvest)
library(slider)
library(RSQLite)
library(jsonlite)
library(lubridate)

# Database connection setup
setup_database <- function(db_path = "data/accc_mergers.sqlite") {
  # Create directory if it doesn't exist
  dir.create(dirname(db_path), showWarnings = FALSE, recursive = TRUE)
  
  # Connect to database
  con <- dbConnect(SQLite(), db_path)
  
  # Create decisions table if it doesn't exist
  if (!dbExistsTable(con, "decisions")) {
    dbExecute(con, "
      CREATE TABLE decisions (
        id TEXT PRIMARY KEY,
        title TEXT,
        link TEXT,
        outcome TEXT,
        date_completed TEXT,
        industry TEXT,
        status TEXT,
        last_updated TEXT
      )
    ")
  }
  
  # Create decisions_detail table if it doesn't exist
  if (!dbExistsTable(con, "decisions_detail")) {
    dbExecute(con, "
      CREATE TABLE decisions_detail (
        id TEXT PRIMARY KEY,
        status TEXT,
        outcome TEXT,
        outcome_datetime TEXT,
        industry TEXT,
        commenced_datetime TEXT,
        review_days TEXT,
        acquirers TEXT,
        targets TEXT,
        timeline TEXT,
        last_updated TEXT,
        FOREIGN KEY (id) REFERENCES decisions (id)
      )
    ")
  }

  if (!dbExistsTable(con, "protected_mergers")) {
    dbExecute(con, "
      CREATE TABLE protected_mergers (
        id TEXT PRIMARY KEY,
        reason TEXT,
        created_datetime TEXT
      )
    ")
  }
  
  return(con)
}

# Function to add a merger to the protected list
protect_merger <- function(merger_id, reason = "Manual update", db_path = "data/accc_mergers.sqlite") {
  con <- dbConnect(SQLite(), db_path)
  on.exit(dbDisconnect(con))
  
  # Check if merger exists in decisions table
  merger_exists <- dbGetQuery(con, sprintf("SELECT COUNT(*) AS count FROM decisions WHERE id = '%s'", merger_id))$count > 0
  
  if (!merger_exists) {
    warning(sprintf("Merger ID '%s' not found in database. Protection will still be applied but verify the ID.", merger_id))
  }
  
  # Add or update protected status
  query <- sprintf("
    INSERT OR REPLACE INTO protected_mergers (id, reason, created_datetime)
    VALUES ('%s', '%s', '%s')
  ", merger_id, gsub("'", "''", reason), as.character(now()))
  
  dbExecute(con, query)
  
  message(sprintf("Merger ID '%s' is now protected from auto-refresh", merger_id))
  return(TRUE)
}

# Function to remove protection from a merger
unprotect_merger <- function(merger_id, db_path = "data/accc_mergers.sqlite") {
  con <- dbConnect(SQLite(), db_path)
  on.exit(dbDisconnect(con))
  
  # Ensure table exists
  setup_protected_mergers_table(con)
  
  # Check if merger is protected
  is_protected <- dbGetQuery(con, sprintf("SELECT COUNT(*) AS count FROM protected_mergers WHERE id = '%s'", merger_id))$count > 0
  
  if (!is_protected) {
    message(sprintf("Merger ID '%s' was not protected", merger_id))
    return(FALSE)
  }
  
  # Remove protection
  dbExecute(con, sprintf("DELETE FROM protected_mergers WHERE id = '%s'", merger_id))
  
  message(sprintf("Protection removed from merger ID '%s'", merger_id))
  return(TRUE)
}

# Function to list all protected mergers
list_protected_mergers <- function(db_path = "data/accc_mergers.sqlite") {
  con <- dbConnect(SQLite(), db_path)
  on.exit(dbDisconnect(con))
  
  # Ensure table exists
  setup_protected_mergers_table(con)
  
  # Get all protected mergers
  protected <- dbReadTable(con, "protected_mergers")
  
  if (nrow(protected) == 0) {
    message("No protected mergers found")
    return(tibble())
  }
  
  # Join with decisions to get titles
  result <- dbGetQuery(con, "
    SELECT p.id, d.title, p.reason, p.created_datetime
    FROM protected_mergers p
    LEFT JOIN decisions d ON p.id = d.id
    ORDER BY p.created_datetime DESC
  ")
  
  return(as_tibble(result))
}

# Helper functions
replace_empty_with_na <- function(x) {
  if (length(x) == 0) return(NA_character_)
  if (length(x) > 1) return(paste(x, collapse = "; "))
  return(x)
}

html_table_time <- function(x, header = NA, trim = TRUE, fill = deprecated(), dec = ".", 
                            na.strings = "NA", convert = TRUE) {
  
  ns <- xml2::xml_ns(x)
  rows <- xml2::xml_find_all(x, ".//tr", ns = ns)
  cells <- lapply(rows, xml2::xml_find_all, ".//td|.//th", 
                  ns = ns)
  times <- lapply(rows, function(z) {
    z |> html_elements("time") |> html_attr("datetime")
  })
  times <- map_chr(times, function(time) {
    if (length(time) == 0) {
      return("")
    } else {
      time
    }
  })
  times <- times[2:length(times)]
  if (length(cells) == 0) {
    return(tibble::tibble())
  }
  out <- rvest:::table_fill(cells, trim = trim)
  if (is.na(header)) {
    header <- all(html_name(cells[[1]]) == "th")
  }
  if (header) {
    col_names <- out[1, , drop = FALSE]
    out <- out[-1, , drop = FALSE]
  } else {
    col_names <- paste0("X", seq_len(ncol(out)))
  }
  colnames(out) <- col_names
  out <- as.data.frame(out)
  out <- bind_cols(out, tibble(time = times))
  df <- tibble::as_tibble(out, .name_repair = "minimal")
  if (isTRUE(convert)) {
    df[] <- lapply(df, function(x) {
      utils::type.convert(x, as.is = TRUE, dec = dec, na.strings = na.strings)
    })
  }
  df |> 
    filter(!if_all(everything(), ~. == ""))
}

# Scrape all decisions from ACCC website
scrape_decisions <- function() {
  # Page
  url <- "https://www.accc.gov.au/public-registers/browse-public-registers?f%5B0%5D=type%3Aacccgov_informal_merger_review"
  
  pg <- read_html(url)
  
  # Completed decisions
  decision_types <- html_attr(html_elements(pg, xpath = '//*[(@id = "accc-facet-area__title--acccgov_outcome")]//a'), "href")
  
  # Add incomplete decisions
  decision_types <- c(
    decision_types, 
    html_attr(html_elements(pg, xpath = '//*[(@id = "accc-facet-area__title--acccgov_status")]//a')[[2]], "href")
  )
  
  urls <- paste0("https://www.accc.gov.au/", decision_types)
  
  decisions <- map_dfr(urls, function(url) {
    
    pg <- read_html(url)
    pages <- html_elements(pg, css = ".page-item--last")
    pages <- html_element(pages, "a")
    pages <- html_attr(pages, "href")
    pages <- str_extract(pages, "[0-9]+$")
    pages <- as.integer(pages)
    
    if (length(pages) == 0) {
      pages <- 0
    }
    
    map_dfr(0:pages, function(page_num) {
      
      current_url <- paste0(url, "&page=", page_num)
      pg <- read_html(current_url)
      
      accc_card_full_width <- html_elements(pg, css = ".accc-card--full-width")
      
      titles <- html_element(accc_card_full_width, css = ".field--name-node-title")
      titles <- html_text2(titles)
      
      links <- html_element(accc_card_full_width, css = ".field--name-node-title")
      links <- html_children(links)
      links <- html_children(links)
      links <- html_attr(links, "href")
      
      outcomes <- accc_card_full_width
      outcomes <- html_element(outcomes, css = ".accc-card__metadata")
      outcomes <- html_element(outcomes, css = ".field--name-field-acccgov-pub-reg-outcome")
      outcomes <- html_element(outcomes, css = ".field__item")
      outcomes <- html_text2(outcomes)
      
      date_completed <- accc_card_full_width
      date_completed <- html_element(date_completed, css = ".accc-card__metadata")
      date_completed <- html_element(date_completed, css = ".field--name-field-acccgov-pub-reg-end-date")
      date_completed <- html_element(date_completed, css = ".field__item")
      date_completed <- html_text2(date_completed)
      
      industry <- accc_card_full_width
      industry <- html_element(industry, css = ".accc-card__metadata")
      industry <- html_element(industry, css = ".field--name-field-acccgov-industry")
      industry <- map(industry, function(node) {
        
        html_text2(html_elements(node, css = ".field__item"))
        
      })
      
      status <- accc_card_full_width
      status <- html_element(status, css = ".accc-card__metadata")
      status <- html_element(status, css = ".field--name-field-acccgov-pub-reg-status")
      status <- html_element(status, css = ".field__item")
      status <- html_text2(status)
      
      tibble(
        title = titles,
        link = links,
        outcome = outcomes,
        date_completed = date_completed,
        industry = industry,
        status = status
      )
    })
  })
  
  # Add unique ID and timestamp
  decisions |> 
    rowwise() |> 
    mutate(
      id = digest::digest(link),
      last_updated = now()
    ) |>
    ungroup()
}

# Get detailed information for a specific merger
# Streamlined get_merger_details function
get_merger_details <- function(merger) {
  tryCatch({
    url <- merger$link
    
    if (length(url) > 1) {
      message("Error - multiple URLs found for merger ID: ", merger$id)
      stop()
    }
    
    # Read the page
    page_url <- paste0("https://www.accc.gov.au/", url)
    pg <- read_html(page_url)
    els <- html_elements(pg, ".accc-public-register-metadata")
    
    # Helper function for extraction with error handling
    extract_field <- function(base, selector, type = "text", attr_name = NULL, 
                              sub_selector = NULL, field_name) {
      # Determine default value based on extraction type
      default_value <- if (type == "list_text") character(0) 
      else if (type == "table") tibble() 
      else NA_character_
      
      tryCatch({
        # Extract elements using selector
        elements <- html_elements(base, selector)
        
        # Apply sub-selector if provided
        if (!is.null(sub_selector)) {
          elements <- html_elements(elements, sub_selector)
        }
        
        # Return default if no elements found
        if (length(elements) == 0) return(default_value)
        
        # Extract data based on type
        if (type == "text") {
          html_text2(elements) |> replace_empty_with_na()
        } else if (type == "attr" && !is.null(attr_name)) {
          html_attr(elements, attr_name) |> replace_empty_with_na()
        } else if (type == "list_text") {
          html_text2(elements)
        } else if (type == "table") {
          result <- html_table_time(elements)
          if (nrow(result) > 0) result else tibble()
        } else {
          default_value
        }
      }, error = function(e) {
        message("Error extracting ", field_name, " for merger ID: ", merger$id, 
                " - ", e$message)
        default_value
      })
    }
    
    # Define field extraction specifications
    field_specs <- list(
      status = list(base = els, selector = ".field--name-field-acccgov-pub-reg-status", 
                    type = "text", sub_selector = ".field__item"),
      outcome = list(base = els, 
                     selector = ".accc-outcome .field--name-field-acccgov-pub-reg-outcome", 
                     type = "text"),
      outcome_datetime = list(base = els, 
                              selector = ".accc-outcome .field--name-field-acccgov-pub-reg-end-date time", 
                              type = "attr", attr_name = "datetime"),
      industry = list(base = els, selector = ".field--name-field-acccgov-industry .field__items", 
                      type = "text"),
      commenced_datetime = list(base = els, 
                                selector = ".field--name-field-acccgov-pub-reg-date time", 
                                type = "attr", attr_name = "datetime"),
      review_days = list(base = els, 
                         selector = ".field--name-field-acccgov-total-review-days .field__item", 
                         type = "attr", attr_name = "content"),
      acquirers = list(base = pg, 
                       selector = ".field--name-field-acccgov-applicants .paragraph--type--acccgov-trader", 
                       type = "list_text"),
      targets = list(base = pg, 
                     selector = ".field--name-field-acccgov-pub-reg-targets .paragraph--type--acccgov-trader", 
                     type = "list_text"),
      timeline = list(base = pg, 
                      selector = ".field--name-field-acccgov-timeline .field__items table", 
                      type = "table")
    )
    
    # Extract all fields
    fields <- map2(field_specs, names(field_specs), function(spec, name) {
      do.call(extract_field, c(spec, field_name = name))
    })
    names(fields) <- names(field_specs)
    
    # Create tibble with all data
    tibble(
      id = merger$id,
      status = fields$status,
      outcome = fields$outcome,
      outcome_datetime = fields$outcome_datetime,
      industry = fields$industry,
      commenced_datetime = fields$commenced_datetime,
      review_days = as.integer(ifelse(is.na(fields$review_days), NA, fields$review_days)),
      acquirers = list(fields$acquirers),
      targets = list(fields$targets),
      timeline = list(fields$timeline),
      last_updated = now()
    )
  }, error = function(e) {
    message("Error processing merger ID: ", merger$id, " - ", e$message)
    return(NULL)
  })
}

# Prepare data for SQLite storage
prepare_for_db <- function(decisions, decisions_detail) {
  # Convert list columns to JSON for storage
  decisions_for_db <- decisions |>
    mutate(
      industry = map_chr(industry, ~toJSON(.x, auto_unbox = TRUE)),
      last_updated = as.character(last_updated)
    )
  
  decisions_detail_for_db <- decisions_detail |>
    mutate(
      # Convert review_days to character type for consistent storage
      review_days = as.character(review_days),
      acquirers = map_chr(acquirers, ~toJSON(.x, auto_unbox = TRUE)),
      targets = map_chr(targets, ~toJSON(.x, auto_unbox = TRUE)),
      timeline = map_chr(timeline, ~toJSON(.x, auto_unbox = TRUE)),
      last_updated = as.character(last_updated)
    )
  
  list(
    decisions = decisions_for_db,
    decisions_detail = decisions_detail_for_db
  )
}

# Read data from database, converting JSON back to lists
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
      review_days = parse_integer(review_days),
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

# Main function to run the scraper in different modes
run_accc_scraper <- function(mode = c("new", "update", "update_only", "refresh_all"), db_path = "data/accc_mergers.sqlite", verbose = TRUE) {
  mode <- match.arg(mode)
  
  # Connect to database
  con <- setup_database(db_path)
  on.exit(dbDisconnect(con))
  
  # Get list of protected merger IDs
  protected_ids <- dbGetQuery(con, "SELECT id FROM protected_mergers")$id
  
  # Set starting message based on mode
  if (mode == "new") {
    message("Running in 'new' mode - only collecting new mergers...")
  } else if (mode == "update") {
    message("Running in 'update' mode - checking for new mergers and updates on ongoing mergers...")
  } else if (mode == "update_only") {
    message("Running in 'update_only' mode - only checking for updates on ongoing mergers...")
  } else {
    message("Running in 'refresh_all' mode - refreshing data for all mergers...")
  }
  
  if (length(protected_ids) > 0) {
    message(sprintf("Note: %d protected mergers will be excluded from updates", length(protected_ids)))
  }
  
  # Get current data from database
  current_data <- read_from_db(con)
  current_decisions <- current_data$decisions
  
  # Scrape current decisions from website
  message("Scraping basic merger information...")
  all_web_decisions <- scrape_decisions()
  
  # Determine which decisions to process based on mode
  if (mode == "new") {
    # Only process mergers not already in database
    to_process <- all_web_decisions |>
      anti_join(current_decisions, by = "id")
    
    message("Found ", nrow(to_process), " new merger(s) to process")
  } else if (mode == "update") {
    # Process all ongoing mergers plus any new ones
    ongoing_mergers <- current_decisions |>
      filter(str_detect(status, regex("ongoing|commenced|phase|review|under consideration", ignore_case = TRUE)))
    
    new_mergers <- all_web_decisions |>
      anti_join(current_decisions, by = "id")
    
    # For existing ongoing mergers, take the new data from the web
    ongoing_ids <- ongoing_mergers$id
    to_process <- all_web_decisions |>
      filter(id %in% ongoing_ids | id %in% new_mergers$id)
    
    message("Found ", nrow(new_mergers), " new merger(s) and ", 
            nrow(ongoing_mergers), " ongoing merger(s) to check for updates")
  } else if (mode == "update_only") {
    # Process all ongoing mergers only
    ongoing_mergers <- current_decisions |>
      filter(str_detect(status, regex("ongoing|commenced|phase|review|under consideration", ignore_case = TRUE)))
    
    # For existing ongoing mergers, take the new data from the web
    ongoing_ids <- ongoing_mergers$id
    to_process <- all_web_decisions |>
      filter(id %in% ongoing_ids)
    
    message("Found ", nrow(ongoing_mergers), " ongoing merger(s) to check for updates")
  } else {
    # Process all mergers (full refresh)
    to_process <- all_web_decisions
    
    message("Running full refresh on all ", nrow(to_process), " merger(s)")
  }
  
  # Filter out protected mergers
  if (length(protected_ids) > 0) {
    original_count <- nrow(to_process)
    to_process <- to_process |>
      filter(!(id %in% protected_ids))
    
    skipped_count <- original_count - nrow(to_process)
    if (skipped_count > 0) {
      message(sprintf("Skipped %d protected merger(s)", skipped_count))
    }
  }
  
  # If nothing to process, exit early
  if (nrow(to_process) == 0) {
    message("No new mergers or updates to process")
    return(invisible(NULL))
  }
  
  # Get detailed information for mergers to process
  message("Fetching detailed information for ", nrow(to_process), " merger(s)...")
  
  decisions_detail <- map_dfr(1:nrow(to_process), function(i) {
    merger <- to_process[i, ]
    if (verbose) {
      message("Processing: ", str_trunc(merger$title, 50))
    }
    Sys.sleep(0.5)  # Be kind to the server
    get_merger_details(merger)
  })
  
  # Prepare data for database storage
  data_for_db <- prepare_for_db(to_process, decisions_detail)
  
  # Write to database using transactions
  message("Writing data to database...")
  
  dbWithTransaction(con, {
    # Add/update decisions
    if (nrow(data_for_db$decisions) > 0) {
      # For each row, check if it exists and update or insert accordingly
      for (i in 1:nrow(data_for_db$decisions)) {
        row <- data_for_db$decisions[i,]
        exists <- dbGetQuery(con, sprintf("SELECT COUNT(*) AS count FROM decisions WHERE id = '%s'", row$id))$count > 0
        
        if (exists) {
          # Update existing record
          cols <- setdiff(names(row), "id")
          update_cols <- paste(cols, "=", paste0("'", gsub("'", "''", as.character(row[, cols])), "'"), collapse = ", ")
          query <- sprintf("UPDATE decisions SET %s WHERE id = '%s'", update_cols, row$id)
          dbExecute(con, query)
        } else {
          # Insert new record
          dbWriteTable(con, "decisions", row, append = TRUE, overwrite = FALSE)
        }
      }
    }
    
    # Add/update decisions_detail
    if (nrow(data_for_db$decisions_detail) > 0) {
      # For each row, check if it exists and update or insert accordingly
      for (i in 1:nrow(data_for_db$decisions_detail)) {
        row <- data_for_db$decisions_detail[i,]
        exists <- dbGetQuery(con, sprintf("SELECT COUNT(*) AS count FROM decisions_detail WHERE id = '%s'", row$id))$count > 0
        
        if (exists) {
          # Update existing record
          cols <- setdiff(names(row), "id")
          update_cols <- paste(cols, "=", paste0("'", gsub("'", "''", as.character(row[, cols])), "'"), collapse = ", ")
          query <- sprintf("UPDATE decisions_detail SET %s WHERE id = '%s'", update_cols, row$id)
          dbExecute(con, query)
        } else {
          # Insert new record
          dbWriteTable(con, "decisions_detail", row, append = TRUE, overwrite = FALSE)
        }
      }
    }
  })
  
  message("Completed successfully!")
  
  # Return the number of processed entries
  list(
    new_or_updated_mergers = nrow(to_process),
    details_collected = nrow(decisions_detail)
  )
}

# Example usage:
# Run to get only new mergers
# run_accc_scraper(mode = "new")

# Run to update ongoing mergers and get new ones
# run_accc_scraper(mode = "update")

# Run to only update ongoing mergers
# run_accc_scraper(mode = "update_only")

# Run to refresh all mergers (full refresh)
# run_accc_scraper(mode = "refresh_all")

# To run this script from command line with arguments
if (!interactive()) {
  args <- commandArgs(trailingOnly = TRUE)
  mode <- if (length(args) > 0) args[1] else "new"
  db_path <- if (length(args) > 1) args[2] else "data/accc_mergers.sqlite"
  
  run_accc_scraper(mode = mode, db_path = db_path)
}

get_merger_commencements <- function(period = c("day", "month", "year"), 
                                        db_path = "data/accc_mergers.sqlite", 
                                        date_start = NULL, 
                                        date_end = NULL) {
  # Match argument
  period <- match.arg(period)
  
  # Connect to database
  con <- dbConnect(SQLite(), db_path)
  on.exit(dbDisconnect(con))
  
  # Read data from database
  db_data <- read_from_db(con)
  decisions_detail <- db_data$decisions_detail
  
  # Extract commencement dates (convert to Date objects)
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
    warning("No valid commencement dates found in the database")
    return(tibble(period_start = as.Date(character()), count = integer()))
  }
  
  # Determine date range
  min_date <- if (!is.null(date_start)) {
    as_date(date_start)
  } else {
    min(valid_dates$commenced_date)
  }
  
  max_last_updated <- max(decisions_detail$last_updated) |> as_date()
  
  max_date <- if (!is.null(date_end)) {
    as_date(date_end)
  } else {
    max_last_updated
  }
  
  # Floor dates based on selected period
  min_period <- floor_date(min_date, period)
  max_period <- floor_date(max_date, period)
  
  # Create a sequence of period starts
  period_sequence <- tibble(period_start = seq.Date(min_period, max_period, by = period))
  
  # Count by period
  period_counts <- valid_dates |>
    mutate(period_start = floor_date(commenced_date, period)) |>
    count(period_start, name = "count")
  
  # Join the period sequence with the counts
  result <- period_sequence |>
    left_join(period_counts, by = "period_start") |>
    mutate(count = replace_na(count, 0))
  
  return(result)
}

calculate_rolling_sums <- function(daily_counts) {
  # Ensure data is sorted by date
  daily_counts <- daily_counts |>
    arrange(date)
  
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
  
  return(result)
}

get_merger_commencements_daily <- function(db_path = "data/accc_mergers.sqlite", 
                                           date_start = NULL, 
                                           date_end = NULL) {
  get_merger_commencements(period = "day", db_path = db_path, date_start = date_start, date_end = date_end)
}
get_merger_commencements_monthly <- function(db_path = "data/accc_mergers.sqlite", 
                                           date_start = NULL, 
                                           date_end = NULL) {
  get_merger_commencements(period = "month", db_path = db_path, date_start = date_start, date_end = date_end)
}
get_merger_commencements_yearly <- function(db_path = "data/accc_mergers.sqlite", 
                                            date_start = NULL, 
                                            date_end = NULL) {
  get_merger_commencements(period = "year", db_path = db_path, date_start = date_start, date_end = date_end)
}
