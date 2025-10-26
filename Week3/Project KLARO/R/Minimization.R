# Load jsonlite for reading JSON
library(jsonlite)

# Try both possible paths for ToReceive.json
if (file.exists("Data/ToReceive.json")) {
  json_data <- fromJSON("Data/ToReceive.json")
} else {
  json_data <- fromJSON("../Data/ToReceive.json")
}

# Handle single or multiple projects
if (is.list(json_data$projects) && !is.data.frame(json_data$projects)) {
  project_list <- json_data$projects
} else {
  project_list <- list(json_data$projects)
}

columns <- json_data$columns
num_cols <- length(columns)

# Build project_matrix robustly: coerce each project's data to a numeric vector of length num_cols
data_list <- lapply(project_list, function(x) {
  d <- x[["data"]]
  if (is.null(d)) {
    return(rep(NA_real_, num_cols))
  }
  if (is.list(d)) d <- unlist(d)
  v <- suppressWarnings(as.numeric(d))
  # if coercion produced NAs but original were numeric-like strings, keep them
  if (length(v) < num_cols) v <- c(v, rep(NA_real_, num_cols - length(v)))
  if (length(v) > num_cols) v <- v[seq_len(num_cols)]
  return(v)
})
project_matrix <- do.call(rbind, data_list)

# Build constraints (all columns except Cost) and objective consistently for any number of projects
constraints <- project_matrix[, 2:ncol(project_matrix), drop=FALSE]
# Helper: safely set dimnames and record diagnostics
diag_messages <- list()
safe_set_rownames <- function(mat, names_vec, label) {
  if (is.null(names_vec)) {
    diag_messages[[length(diag_messages) + 1]] <<- paste0(label, ': names vector is NULL; using defaults')
    rownames(mat) <- paste0(label, '_', seq_len(nrow(mat)))
    return(mat)
  }
  if (length(names_vec) != nrow(mat)) {
    diag_messages[[length(diag_messages) + 1]] <<- paste0(label, ': names length (', length(names_vec),
                                                           ') != nrow(mat) (', nrow(mat), '); using defaults')
    rownames(mat) <- paste0(label, '_', seq_len(nrow(mat)))
    return(mat)
  }
  rownames(mat) <- names_vec
  return(mat)
}

safe_set_colnames <- function(mat, names_vec, label) {
  if (is.null(names_vec)) {
    diag_messages[[length(diag_messages) + 1]] <<- paste0(label, ': col names vector is NULL; using defaults')
    colnames(mat) <- paste0(label, '_col_', seq_len(ncol(mat)))
    return(mat)
  }
  if (length(names_vec) != ncol(mat)) {
    diag_messages[[length(diag_messages) + 1]] <<- paste0(label, ': col names length (', length(names_vec),
                                                           ') != ncol(mat) (', ncol(mat), '); using defaults')
    colnames(mat) <- paste0(label, '_col_', seq_len(ncol(mat)))
    return(mat)
  }
  colnames(mat) <- names_vec
  return(mat)
}

proj_names_vec <- sapply(project_list, function(x) x[["name"]])
constraints <- safe_set_rownames(constraints, proj_names_vec, 'Project')
constraints <- safe_set_colnames(constraints, columns[2:length(columns)], 'Pollutant')

objective <- project_matrix[, 1]
if (length(objective) != nrow(constraints)) {
  diag_messages[[length(diag_messages) + 1]] <- paste0('Objective length (', length(objective),
                                                     ') != number of projects (', nrow(constraints), '); trimming or padding with NA')
  # Trim or pad
  if (length(objective) > nrow(constraints)) objective <- objective[seq_len(nrow(constraints))]
  if (length(objective) < nrow(constraints)) objective <- c(objective, rep(NA, nrow(constraints) - length(objective)))
}
names(objective) <- rownames(constraints)

full_matrix <- rbind(constraints, Cost=objective)
print(full_matrix)



# ---------------------------------------------------------------------------
# Prepare transposed tableau for the frontend/solver and write to Data/ToSend.json
# Orientation: constraints as rows (pollutants), projects as columns. Add RHS (defaults to 0)

# Project names and pollutant (constraint) names
project_names <- sapply(project_list, function(x) x$name)
pollutant_names <- columns[2:length(columns)]

# Transpose constraints so rows = pollutants, cols = projects
trans_constraints <- t(project_matrix[, 2:ncol(project_matrix), drop=FALSE])
# Safely set names for transposed constraints
trans_constraints <- safe_set_colnames(trans_constraints, project_names, 'Project_transposed')
trans_constraints <- safe_set_rownames(trans_constraints, pollutant_names, 'Pollutant_transposed')

# Add RHS column (defaults to zeros for now)
RHS <- rep(0, nrow(trans_constraints))
tableau <- cbind(trans_constraints, RHS = RHS)

# Objective row: cost coefficients for each project; add a trailing 0 for RHS
objective_row <- c(project_matrix[, 1], 0)
tableau <- rbind(tableau, Cost = objective_row)

# Prepare JSON-friendly structure (tableau as array-of-rows)
tableau_matrix <- unname(as.matrix(tableau))
tableau_rows <- lapply(seq_len(nrow(tableau_matrix)), function(i) as.numeric(tableau_matrix[i, ]))

to_send <- list(
  orientation = "constraints_as_rows",
  row_names = rownames(tableau_matrix),
  col_names = colnames(tableau_matrix),
  tableau = tableau_rows,
  note = "RHS defaults to zeros. To run minimization provide RHS targets (one per pollutant) or a budget constraint."
)

# Determine write path consistent with how ToReceive.json was found
send_path <- if (file.exists("Data/ToReceive.json")) "Data/ToSend.json" else "../Data/ToSend.json"
write(toJSON(to_send, pretty=TRUE, auto_unbox=TRUE), file = send_path)
cat(sprintf("Wrote transposed tableau to %s\n", send_path))

# If the JSON contains explicit targets (RHS for each pollutant), build a proper simplex tableau
# and attempt to run the Minimize() routine. This requires json_data$targets to be length = number of pollutants.
if (!is.null(json_data$targets)) {
  targets <- json_data$targets
  if (length(targets) == nrow(trans_constraints)) {
    # Build standard simplex tableau: [A | I | Z], rows = pollutants, cols = projects + slack + Z
    A <- trans_constraints
    m <- nrow(A)
    n <- ncol(A)

    # Slack identity
    I <- diag(1, m, m)

    # RHS column is targets
    RHS_vec <- as.numeric(targets)

    # Build tableau matrix: constraints rows
    constraint_rows <- cbind(A, I, RHS_vec)

    # Objective row: minimization -> put negative cost coefficients so Minimize will pivot
    cost_coeffs <- as.numeric(project_matrix[,1])
    if (length(cost_coeffs) < n) cost_coeffs <- c(cost_coeffs, rep(0, n - length(cost_coeffs)))
    obj_row <- c(-cost_coeffs, rep(0, m), 0)

    simplex_tableau <- rbind(constraint_rows, obj_row)

    # Set column and row names to match Minimize expectations
    colnames(simplex_tableau) <- c(paste0('x', seq_len(n)), paste0('S', seq_len(m)), 'Z')
    rownames(simplex_tableau) <- c(paste0('p', seq_len(m)), 'Cost')

    # Run the minimizer inside a safe tryCatch so we capture errors
    minimize_result <- tryCatch({
      res <- Minimize(as.matrix(simplex_tableau))
      list(success=TRUE, result=res)
    }, error=function(e) list(success=FALSE, error=as.character(e)))

    # Attach minimization result to output JSON
    send_min <- list()
    if (is.list(minimize_result) && minimize_result$success) {
      # Raw outputs
      finalT <- minimize_result$result$finalTableau
      rawBasic <- minimize_result$result$basicSolution
      rawZ <- minimize_result$result$Z

      # Convert final tableau to data.frame for inspection
      send_min$finalTableau <- as.data.frame(finalT)

      # Attempt to extract only the decision variables (x1..xn) and map them to project names
      coln <- colnames(finalT)
      # decision variables are expected to be the first n columns named x1..xn
      x_idx <- which(grepl('^x', coln, perl=TRUE))
      if (length(x_idx) == 0) {
        # Fallback: assume first n columns correspond to projects (n from project_matrix)
        x_idx <- seq_len(min(ncol(finalT) - 1, n))
      }
      x_names <- coln[x_idx]

      # Build a named numeric vector for x values, defaulting to 0 if not present in rawBasic
      x_values <- setNames(rep(0, length(x_names)), x_names)
      for (xn in x_names) {
        if (!is.null(rawBasic[[xn]])) {
          x_values[xn] <- as.numeric(rawBasic[[xn]])
        } else {
          # If the basic solution was returned as an unnamed vector, try to find the corresponding index
          if (is.numeric(names(rawBasic))) {
            # ignore
          }
        }
      }

      # Map x_values to project names (if available) using project_names from the outer scope
      # project_names was defined earlier as sapply(project_list, function(x) x$name)
      if (exists('project_names') && length(project_names) == length(x_values)) {
        names(x_values) <- project_names
      }

      # Recompute the true objective value from costs * x_values to avoid sign/format ambiguity
      # cost_coeffs was defined earlier as numeric vector of project costs
      trueZ <- NA_real_
      if (exists('cost_coeffs')) {
        # align cost_coeffs with x_values order (project_names)
        costs_vec <- as.numeric(cost_coeffs)
        if (length(costs_vec) >= length(x_values)) {
          # If names are project names, align by name
          if (!is.null(names(x_values)) && !is.null(names(costs_vec))) {
            # try name alignment
            if (all(names(x_values) %in% names(costs_vec))) {
              trueZ <- sum(costs_vec[names(x_values)] * as.numeric(x_values))
            } else {
              trueZ <- sum(costs_vec[seq_along(x_values)] * as.numeric(x_values))
            }
          } else {
            trueZ <- sum(costs_vec[seq_along(x_values)] * as.numeric(x_values))
          }
        }
      }

      send_min$basicSolution <- as.list(x_values)
      send_min$Z <- if (!is.na(trueZ)) trueZ else rawZ
      # add diagnostics comparing raw returned Z (from tableau) and recomputed cost
      send_min$diagnostics <- list(rawZ = rawZ, recomputedZ = send_min$Z, note = 'rawZ from tableau vs recomputed cost from x variables')
    } else {
      send_min$error <- minimize_result$error
    }

    # Update ToSend.json with minimization outputs
    existing <- fromJSON(send_path)
    existing$minimization <- send_min
    write(toJSON(existing, pretty=TRUE, auto_unbox=TRUE), file = send_path)
    cat(sprintf("Wrote minimization results to %s\n", send_path))
  } else {
    cat(sprintf("targets length (%d) does not match number of pollutants (%d); skipping minimization\n", length(targets), nrow(trans_constraints)))
  }
}


#============================================================================================
# Function that starts the Minimization Process
Minimize <- function(tableau) {
  col_num <- ncol(tableau)
  row_num <- nrow(tableau)
  tol <- 1e-9
  max_iter <- 10000
  iter <- 0

  while (TRUE) {
    iter <- iter + 1
    if (iter > max_iter) stop(sprintf("Max iterations exceeded (%d)", max_iter))

    # Check last row (reduced costs) for improvement (negative entries indicate improvement in this sign convention)
    last_row <- tableau[row_num, 1:(col_num - 1)]
    # If there are no (significant) negative reduced costs, we are optimal
    entering_candidates <- which(last_row < -tol)
    if (length(entering_candidates) == 0) break

    # Choose entering column: most negative reduced cost, tie-break by smallest index (Bland's rule)
    vals <- last_row[entering_candidates]
    min_idx <- which.min(vals)
    pivot_column <- entering_candidates[min_idx]

    # Compute ratio test only for positive coefficients in the pivot column
    test_ratio <- rep(Inf, row_num - 1)
    for (i in seq_len(row_num - 1)) {
      a_ij <- tableau[i, pivot_column]
      if (is.finite(a_ij) && a_ij > tol) {
        test_ratio[i] <- tableau[i, col_num] / a_ij
      }
    }

    finite_idx <- which(is.finite(test_ratio))
    if (length(finite_idx) == 0) {
      stop("Unbounded: no positive entries in pivot column; objective can decrease without bound")
    }

    # Choose leaving row by minimum ratio; tie-break by smallest row index (Bland's rule)
    min_ratio <- min(test_ratio[finite_idx])
    candidate_rows <- finite_idx[which(abs(test_ratio[finite_idx] - min_ratio) < tol)]
    pivot_row <- min(candidate_rows)

    pivot_element <- tableau[pivot_row, pivot_column]
    if (!is.finite(pivot_element) || abs(pivot_element) < tol) {
      stop(sprintf("Pivot element is zero or numerically unstable (row=%d, col=%d)", pivot_row, pivot_column))
    }

    # Normalize pivot row
    normalized_pivot_row <- tableau[pivot_row, ] / pivot_element
    tableau[pivot_row, ] <- normalized_pivot_row

    # Eliminate pivot column entries in other rows
    for (i in seq_len(nrow(tableau))) {
      if (i == pivot_row) next
      factor <- tableau[i, pivot_column]
      if (!is.finite(factor) || abs(factor) < tol) {
        # if essentially zero, leave row
        next
      }
      tableau[i, ] <- tableau[i, ] - normalized_pivot_row * factor
    }
  }

  Z <- tableau[row_num, col_num]

  # Extract basic solution by identifying unit columns in constraint rows
  vars <- colnames(tableau)
  basic_sol <- setNames(rep(0, length(vars)), vars)
  for (j in seq_len(ncol(tableau) - 1)) {
    col_vec <- tableau[1:(row_num - 1), j]
    # find if column is a unit vector within tolerance
    ones <- which(abs(col_vec - 1) < tol)
    if (length(ones) == 1) {
      other_idx <- setdiff(seq_along(col_vec), ones)
      if (all(abs(col_vec[other_idx]) < tol)) {
        # basic variable; value is RHS at that row
        basic_sol[j] <- tableau[ones, col_num]
      }
    }
  }

  # Return only named solution entries (x and slack variables) and Z
  basicSolution <- basic_sol
  basicSolution["Z"] <- Z

  return(list(finalTableau = tableau, basicSolution = basicSolution, Z = Z))
}