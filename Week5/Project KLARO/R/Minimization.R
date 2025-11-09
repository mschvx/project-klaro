library(jsonlite)

# ============================= #
# PART A. LOADING THE JSON FILE #
# ============================= #

# A.1. Determine the directory of the current script
get_script_dir <- function() {
  dir <- tryCatch(dirname(normalizePath(sys.frame(1)$ofile)), error = function(e) NULL)
  if (is.null(dir) || dir == "") dir <- getwd()
  return(dir)
}
script_dir <- get_script_dir()

# A.2. Find or create 'Data' directory for ToSend.json
find_or_create_data_dir <- function(start_dir, max_up = 5) {
  current <- normalizePath(start_dir, winslash = "/", mustWork = FALSE)
  for (i in 0:max_up) {
    candidate <- file.path(current, "Data")
    if (dir.exists(candidate)) return(candidate)
    parent <- dirname(current)
    if (parent == current) break
    current <- parent
  }
  fallback <- file.path(dirname(start_dir), "Data")
  if (!dir.exists(fallback)) dir.create(fallback, showWarnings = FALSE, recursive = TRUE)
  return(fallback)
}

# A.3. Write a payload to ToSend.json
write_ToSend <- function(payload) {
  data_dir <- find_or_create_data_dir(script_dir)
  path <- file.path(data_dir, "ToSend.json")
  tryCatch({
    write_json(payload, path, auto_unbox = TRUE, pretty = TRUE)
  }, error = function(e) {
    try({
      txt <- toJSON(payload, auto_unbox = TRUE, pretty = TRUE)
      writeLines(txt, con = path)
    }, silent = TRUE)
  })
}

# A.4. Search upwards for ToReceive.json
find_json_path <- function(start_dir, filename = "ToReceive.json", max_up = 5) {
  current <- normalizePath(start_dir, winslash = "/", mustWork = FALSE)
  tried <- character()
  for (i in 0:max_up) {
    candidate_data <- file.path(current, "Data", filename)
    candidate_here <- file.path(current, filename)
    tried <- c(tried, candidate_data, candidate_here)
    if (file.exists(candidate_data)) return(candidate_data)
    if (file.exists(candidate_here)) return(candidate_here)
    parent <- dirname(current)
    if (parent == current) break
    current <- parent
  }
  wd_cand1 <- file.path(getwd(), "Data", filename)
  wd_cand2 <- file.path(getwd(), filename)
  tried <- c(tried, wd_cand1, wd_cand2)
  if (file.exists(wd_cand1)) return(wd_cand1)
  if (file.exists(wd_cand2)) return(wd_cand2)
  stop(sprintf("Could not find %s. Paths tried:\n%s", filename, paste(unique(tried), collapse = "\n")))
}

json_path <- find_json_path(script_dir, "ToReceive.json")
data <- fromJSON(json_path, simplifyVector = FALSE)

# ============================ #
# PART B. PREPARE PROJECT MATRIX #
# ============================ #

# B.1. Convert project data into numeric matrix
projects <- data$projects
project_matrix <- do.call(rbind, lapply(projects, function(p) as.numeric(unlist(p$data))))

# B.2. Extract costs and pollutant reductions
project_costs <- as.numeric(project_matrix[, 1])                # first column = cost
pollutant_reductions <- t(project_matrix[, -1, drop = FALSE])  # transpose to pollutants x projects
pollutant_goals <- as.numeric(unlist(data$goals))              # RHS targets

num_projects <- ncol(pollutant_reductions)
num_pollutants <- nrow(pollutant_reductions)

# ========================================== #
# PART C. BUILD TWO-PHASE SIMPLEX TABLEAU    #
# ========================================== #

# C.1. Build pollutant constraint rows (>= goals)
pollutant_constraints <- matrix(0, nrow = num_pollutants, ncol = num_projects + num_pollutants*2 + num_projects + 1)
for (i in 1:num_pollutants) {
  pollutant_constraints[i, 1:num_projects] <- pollutant_reductions[i, ]         # x coeffs
  pollutant_constraints[i, num_projects + i] <- -1                              # surplus s_i
  pollutant_constraints[i, num_projects + num_pollutants + i] <- 1              # artificial a_i
  pollutant_constraints[i, ncol(pollutant_constraints)] <- pollutant_goals[i]   # RHS
}

# C.2. Build upper-bound constraint rows (x_i <= 20)
ub_constraints <- matrix(0, nrow = num_projects, ncol = num_projects + num_pollutants*2 + num_projects + 1)
for (i in 1:num_projects) {
  ub_constraints[i, i] <- 1                                  # x_i coefficient
  ub_constraints[i, num_projects + num_pollutants*2 + i] <- 1 # upper-bound slack
  ub_constraints[i, ncol(ub_constraints)] <- 20              # RHS = 20
}

# C.3. Combine all constraints into tableau
tableau_body <- rbind(pollutant_constraints, ub_constraints)
total_var_cols <- ncol(tableau_body) - 1

# ================================= #
# PART D. PHASE I OBJECTIVE SETUP   #
# ================================= #

# D.1. Initialize Phase I cost vector (minimize sum of artificials)
phase1_cost <- rep(0, total_var_cols)
artificial_cols <- (num_projects + num_pollutants + 1):(num_projects + num_pollutants*2)
phase1_cost[artificial_cols] <- 1

# D.2. Compute reduced costs for Phase I
phase1_row <- phase1_cost
phase1_rhs <- 0
for (i in 1:num_pollutants) {
  phase1_row <- phase1_row - tableau_body[i, 1:total_var_cols]
  phase1_rhs <- phase1_rhs - tableau_body[i, ncol(tableau_body)]
}

# D.3. Build full Phase I tableau
tableau <- cbind(tableau_body[, 1:total_var_cols], tableau_body[, ncol(tableau_body)])
tableau <- rbind(tableau, c(phase1_row, phase1_rhs))

# D.4. Label columns and rows
colnames(tableau) <- c(paste0("x", 1:num_projects), paste0("s", 1:num_pollutants),
                       paste0("a", 1:num_pollutants), paste0("ub_s", 1:num_projects), "RHS")
rownames(tableau) <- c(paste0("p", 1:num_pollutants), paste0("ub", 1:num_projects), "Phase1")

# ================================= #
# PART E. SIMPLEX FUNCTION          #
# ================================= #

# E.1. Define simplex pivoting function for minimization
Simplex <- function(tab, tol = 1e-9, verbose = FALSE, trace = FALSE) {
  tab <- as.matrix(tab)
  trace_list <- list()
  iter <- 0
  
  while (TRUE) {
    obj_row <- tab[nrow(tab), 1:(ncol(tab)-1)]
    if (!any(obj_row < -tol)) break
    
    # E.2. Determine pivot column (most negative reduced cost)
    pivot_col <- which.min(obj_row)
    
    # E.3. Determine pivot row (minimum positive ratio)
    ratios <- rep(Inf, nrow(tab)-1)
    for (r in 1:(nrow(tab)-1)) {
      val <- tab[r, pivot_col]
      if (val > tol) ratios[r] <- tab[r, ncol(tab)] / val
    }
    if (all(is.infinite(ratios))) stop("Unbounded problem.")
    pivot_row <- which.min(ratios)
    
    # E.4. Normalize pivot row and eliminate pivot column
    pivot_val <- tab[pivot_row, pivot_col]
    tab[pivot_row, ] <- tab[pivot_row, ] / pivot_val
    for (r in 1:nrow(tab)) {
      if (r != pivot_row) {
        factor <- tab[r, pivot_col]
        if (abs(factor) > tol) tab[r, ] <- tab[r, ] - factor * tab[pivot_row, ]
      }
    }
    
    iter <- iter + 1
    if (trace) {
      num_rows <- nrow(tab)-1
      num_cols <- ncol(tab)-1
      basics <- list()
      if (num_cols > 0) {
        for (c in 1:num_cols) {
          col_vec <- tab[1:num_rows, c]
          ones <- which(abs(col_vec - 1) < 1e-8)
          zeros <- which(abs(col_vec) < 1e-8)
          if (length(ones) == 1 && (length(ones)+length(zeros) == num_rows)) {
            basics[[length(basics)+1]] <- list(var=colnames(tab)[c], row=as.integer(ones), value=as.numeric(tab[ones, ncol(tab)]))
          }
        }
      }
      trace_list[[iter]] <- list(tableau=tab, basics=basics)
    }
    
    if (verbose) cat("Pivoted col", pivot_col, "row", pivot_row, "\n")
  }
  
  if (trace) return(list(tab=tab, trace=trace_list))
  return(tab)
}

# ============================ #
# PART F. RUN PHASE I PROCESS  #
# ============================ #

# F.1. Run Phase I simplex (trace enabled)
phase1_result <- Simplex(tableau, tol = 1e-8, verbose = FALSE, trace = TRUE)
if (is.list(phase1_result) && !is.null(phase1_result$tab)) {
  phase1_tableau <- phase1_result$tab
  phase1_trace <- phase1_result$trace
} else {
  phase1_tableau <- phase1_result
  phase1_trace <- list()
}

# F.2. Check feasibility
phase1_obj_val <- phase1_tableau[nrow(phase1_tableau), ncol(phase1_tableau)]
if (abs(phase1_obj_val) > 1e-6) stop("Infeasible problem!")

# ============================= #
# PART G. BUILD PHASE II TABLE  #
# ============================= #

# G.1. Remove artificial variable columns
artificial_cols_idx <- grep("^a[0-9]+$", colnames(phase1_tableau))
if (length(artificial_cols_idx) > 0) {
  phase2_tableau <- phase1_tableau[, -artificial_cols_idx, drop = FALSE]
} else {
  phase2_tableau <- phase1_tableau
}

# G.2. Construct Phase II objective row
current_cols <- colnames(phase2_tableau)
num_coeffs <- ncol(phase2_tableau) - 1
phase2_costs <- rep(0, num_coeffs)
for (k in 1:num_coeffs) {
  nm <- current_cols[k]
  if (grepl("^x", nm)) {
    idx <- as.integer(sub("^x", "", nm))
    phase2_costs[k] <- project_costs[idx]
  } else {
    phase2_costs[k] <- 0
  }
}
phase2_obj_row <- c(phase2_costs, 0)

# G.3. Compute reduced costs for Phase II
tab_body <- phase2_tableau[1:(nrow(phase2_tableau)-1), 1:num_coeffs, drop = FALSE]
basic_cols <- integer(0)
basic_rows <- integer(0)
if (ncol(tab_body) > 0) {
  for (col_idx in seq_len(ncol(tab_body))) {
    col_vec <- tab_body[, col_idx]
    ones <- which(abs(col_vec - 1) < 1e-8)
    zeros <- which(abs(col_vec) < 1e-8)
    if (length(ones) == 1 && (length(ones) + length(zeros) == nrow(tab_body))) {
      basic_cols <- c(basic_cols, col_idx)
      basic_rows <- c(basic_rows, ones)
    }
  }
}
reduced_row <- phase2_obj_row
for (i in seq_along(basic_cols)) {
  col_idx <- basic_cols[i]
  row_idx <- basic_rows[i]
  varname <- current_cols[col_idx]
  cb <- if (grepl("^x", varname)) project_costs[as.integer(sub("^x", "", varname))] else 0
  if (cb != 0) {
    reduced_row[1:num_coeffs] <- reduced_row[1:num_coeffs] - cb * phase2_tableau[row_idx, 1:num_coeffs]
    reduced_row[num_coeffs+1] <- reduced_row[num_coeffs+1] - cb * phase2_tableau[row_idx, num_coeffs+1]
  }
}
phase2_tableau[nrow(phase2_tableau), ] <- reduced_row
rownames(phase2_tableau)[nrow(phase2_tableau)] <- "Phase2"

# ============================ #
# PART H. RUN PHASE II PROCESS #
# ============================ #

# H.1. Run Phase II simplex (trace enabled)
phase2_result <- Simplex(phase2_tableau, tol = 1e-8, verbose = FALSE, trace = TRUE)
if (is.list(phase2_result) && !is.null(phase2_result$tab)) {
  final_tableau <- phase2_result$tab
  phase2_trace <- phase2_result$trace
} else {
  final_tableau <- phase2_result
  phase2_trace <- list()
}

# ============================ #
# PART I. EXTRACT FINAL RESULT #
# ============================ #

# I.1. Extract solution
solution_units <- rep(0, num_projects)
tab_body_final <- final_tableau[1:(nrow(final_tableau)-1), 1:(ncol(final_tableau)-1), drop = FALSE]
if (ncol(tab_body_final) > 0) {
  for (col_idx in seq_len(ncol(tab_body_final))) {
    col_vec <- tab_body_final[, col_idx]
    ones <- which(abs(col_vec - 1) < 1e-8)
    zeros <- which(abs(col_vec) < 1e-8)
    if (length(ones) == 1 && (length(ones)+length(zeros) == nrow(tab_body_final))) {
      varname <- colnames(final_tableau)[col_idx]
      if (grepl("^x", varname)) {
        xi <- as.integer(sub("^x", "", varname))
        solution_units[xi] <- final_tableau[ones, ncol(final_tableau)]
      }
    }
  }
}

# I.2. Compute total minimized cost
total_cost <- sum(solution_units * project_costs)

# I.3. Build breakdown for each project
breakdown <- lapply(seq_len(num_projects), function(i) {
  name <- NULL
  try({ name <- projects[[i]]$name }, silent = TRUE)
  units <- as.numeric(solution_units[i])
  cost_i <- as.numeric(units * project_costs[i])
  list(name = ifelse(is.null(name) || is.na(name), paste0("x", i), name), units = units, cost = cost_i)
})

# I.4. Build iterations payload (Phase1 + Phase2)
iterations <- list()
if (exists('phase1_trace') && length(phase1_trace) > 0) {
  for (i in seq_along(phase1_trace)) {
    item <- phase1_trace[[i]]
    iterations[[length(iterations)+1]] <- list(phase='Phase1', step=as.integer(i), tableau=item$tableau, basics=item$basics)
  }
}
if (exists('phase2_trace') && length(phase2_trace) > 0) {
  for (i in seq_along(phase2_trace)) {
    item <- phase2_trace[[i]]
    iterations[[length(iterations)+1]] <- list(phase='Phase2', step=as.integer(i), tableau=item$tableau, basics=item$basics)
  }
}

# I.5. Write results to ToSend.json
write_ToSend(list(minimization=list(Z=unname(as.numeric(total_cost)), breakdown=breakdown, iterations=iterations)))

print(total_cost)