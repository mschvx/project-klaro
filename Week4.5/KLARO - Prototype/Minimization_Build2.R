library(jsonlite)

# ============================= #
# PART A. LOADING THE JSON FILE #
# ============================= #

# A.1. Load JSON dynamically
script_dir <- dirname(normalizePath(sys.frame(1)$ofile))
json_path <- file.path(script_dir, "ToReceive.json")
data <- fromJSON(json_path, simplifyVector = FALSE)

# A.2. Convert projects data into matrix
projects <- data$projects
pmat <- do.call(rbind, lapply(projects, function(p) as.numeric(unlist(p$data))))


# =========================== #
# PART B. BUILDING THE MATRIX #
# =========================== #

# B.1. Get pollutants and costs
costs <- as.numeric(pmat[, 1])        # the cost is the first value
reductions <- t(pmat[, -1, drop = FALSE])   # m x n (pollutants x projects)

# B.2. Add goals to RHS
goals <- as.numeric(unlist(data$goals))  


# ================================= #
# PART C. BUILD TWO-PHASE TABLEAU   #
# ================================= #

# C.1. Define counts for variables and constraints
n <- ncol(reductions)  # number of projects
m <- nrow(reductions)  # number of pollutants 

# C.2. Build pollutant constraint rows 
pollutant_rows <- matrix(0, nrow = m, ncol = n + m + m + n + 1)  # +1 for RHS
for (j in 1:m) {
  pollutant_rows[j, 1:n] <- reductions[j, ]              # x coefficients
  pollutant_rows[j, n + j] <- -1                         # surplus s_j
  pollutant_rows[j, n + m + j] <- 1                      # artificial a_j
  pollutant_rows[j, n + m + m + n + 1] <- goals[j]       # RHS = goal
}

# C.3. Build upper-bound constraint rows (xi ≤ 20)
ub_rows <- matrix(0, nrow = n, ncol = n + m + m + n + 1)
for (i in 1:n) {
  ub_rows[i, i] <- 1                                      # x_i coefficient
  ub_rows[i, n + m + m + i] <- 1                          # ub slack variable
  ub_rows[i, n + m + m + n + 1] <- 20                     # RHS = 20
}

# C.4. Combine all constraints into single tableau body
table_body <- rbind(pollutant_rows, ub_rows)
num_var_cols <- n + m + m + n


# =============================== #
# PART D. BUILD PHASE I OBJECTIVE #
# =============================== #

# D.1. Define Phase I cost vector (minimize sum of artificials)
c_phase1 <- rep(0, num_var_cols)
art_cols <- (n + m + 1):(n + m + m)
c_phase1[art_cols] <- 1

# D.2. Compute reduced costs for Phase I
phase1_coeffs <- c_phase1
phase1_rhs <- 0
for (j in 1:m) {
  phase1_coeffs <- phase1_coeffs - 1 * table_body[j, 1:num_var_cols]
  phase1_rhs <- phase1_rhs - 1 * table_body[j, num_var_cols + 1]
}

# D.3. Build full tableau (constraints + objective)
tableau <- cbind(table_body[, 1:num_var_cols], table_body[, num_var_cols + 1])
phase1_full <- c(phase1_coeffs, phase1_rhs)
tableau <- rbind(tableau, phase1_full)

# D.4. Label tableau columns and rows
colnames(tableau) <- c(paste0("x", 1:n), paste0("s", 1:m), paste0("a", 1:m),
                       paste0("ub_s", 1:n), "RHS")
rownames(tableau) <- c(paste0("p", 1:m), paste0("ub", 1:n), "Phase1")


# ==================================== #
# PART E. SIMPLEX PIVOT FUNCTION (MIN) #
# ==================================== #

# E.1. Define pivot operation for minimization simplex
SimplexPivot <- function(tab, tol = 1e-9, verbose = FALSE) {
  tab <- as.matrix(tab)
  while (TRUE) {
    row_num <- nrow(tab)
    col_num <- ncol(tab)
    obj <- tab[row_num, 1:(col_num - 1)]
    if (!any(obj < -tol)) break
    
    # E.2. Determine pivot column (most negative reduced cost)
    pivot_col <- which.min(obj)
    
    # E.3. Determine pivot row (minimum positive ratio)
    ratios <- rep(Inf, row_num - 1)
    for (r in 1:(row_num - 1)) {
      a <- tab[r, pivot_col]
      if (a > tol) ratios[r] <- tab[r, col_num] / a
    }
    if (all(is.infinite(ratios))) stop("LP is unbounded.")
    pivot_row <- which.min(ratios)
    
    # E.4. Normalize and eliminate pivot
    pivot_elem <- tab[pivot_row, pivot_col]
    tab[pivot_row, ] <- tab[pivot_row, ] / pivot_elem
    for (r in seq_len(nrow(tab))) {
      if (r == pivot_row) next
      factor <- tab[r, pivot_col]
      if (abs(factor) > tol) tab[r, ] <- tab[r, ] - factor * tab[pivot_row, ]
    }
    
    if (verbose) cat("Pivoted col", pivot_col, "row", pivot_row, "\n")
  }
  return(tab)
}


# ============================ #
# PART F. RUN PHASE I PROCESS  #
# ============================ #

# F.1. Run Phase I pivoting
phase1_tab <- SimplexPivot(tableau, tol = 1e-8, verbose = FALSE)

# F.2. Check feasibility
phase1_obj <- phase1_tab[nrow(phase1_tab), ncol(phase1_tab)]
if (abs(phase1_obj) > 1e-6) stop("Infeasible problem: Phase I objective > 0")


# ============================= #
# PART G. BUILD PHASE II TABLE  #
# ============================= #

# G.1. Remove artificial variable columns
a_cols_idx <- grep("^a[0-9]+$", colnames(phase1_tab))
if (length(a_cols_idx) > 0) {
  phase2_tab <- phase1_tab[, -a_cols_idx, drop = FALSE]
} else {
  phase2_tab <- phase1_tab
}

# G.2. Construct Phase II cost vector
current_cols <- colnames(phase2_tab)
num_coeffs <- ncol(phase2_tab) - 1
base_costs <- rep(0, num_coeffs)
for (k in 1:num_coeffs) {
  nm <- current_cols[k]
  if (grepl("^x", nm)) {
    idx <- as.integer(sub("^x", "", nm))
    base_costs[k] <- costs[idx]
  } else {
    base_costs[k] <- 0
  }
}
phase2_obj <- c(base_costs, 0)

# G.3. Compute reduced costs for Phase II
tab_body <- phase2_tab[1:(nrow(phase2_tab) - 1), 1:num_coeffs, drop = FALSE]
basic_cols <- integer(0)
basic_rows <- integer(0)
for (col_idx in 1:ncol(tab_body)) {
  col_vec <- tab_body[, col_idx]
  ones <- which(abs(col_vec - 1) < 1e-8)
  zeros <- which(abs(col_vec) < 1e-8)
  if (length(ones) == 1 && (length(ones) + length(zeros) == nrow(tab_body))) {
    basic_cols <- c(basic_cols, col_idx)
    basic_rows <- c(basic_rows, ones)
  }
}
reduced_row <- phase2_obj
for (i in seq_along(basic_cols)) {
  col_idx <- basic_cols[i]
  row_idx <- basic_rows[i]
  varname <- current_cols[col_idx]
  if (grepl("^x", varname)) cb <- costs[as.integer(sub("^x", "", varname))] else cb <- 0
  if (cb != 0) {
    reduced_row[1:num_coeffs] <- reduced_row[1:num_coeffs] - cb * phase2_tab[row_idx, 1:num_coeffs]
    reduced_row[num_coeffs + 1] <- reduced_row[num_coeffs + 1] - cb * phase2_tab[row_idx, num_coeffs + 1]
  }
}

# G.4. Insert Phase II objective row
phase2_tab[nrow(phase2_tab), ] <- reduced_row
rownames(phase2_tab)[nrow(phase2_tab)] <- "Phase2"


# ============================ #
# PART H. RUN PHASE II PROCESS #
# ============================ #

# H.1. Run Phase II pivoting
final_tab <- SimplexPivot(phase2_tab, tol = 1e-8, verbose = FALSE)


# ============================ #
# PART I. EXTRACT FINAL RESULT #
# ============================ #

# I.1. Extract solution 
solution <- rep(0, n)
tab_body_final <- final_tab[1:(nrow(final_tab) - 1), 1:(ncol(final_tab) - 1), drop = FALSE]
for (col_idx in 1:ncol(tab_body_final)) {
  col_vec <- tab_body_final[, col_idx]
  ones <- which(abs(col_vec - 1) < 1e-8)
  zeros <- which(abs(col_vec) < 1e-8)
  if (length(ones) == 1 && (length(ones) + length(zeros) == nrow(tab_body_final))) {
    varname <- colnames(final_tab)[col_idx]
    if (grepl("^x", varname)) {
      xi <- as.integer(sub("^x", "", varname))
      solution[xi] <- final_tab[ones, ncol(final_tab)]
    }
  }
}

# I.2. Compute total minimized cost
total_cost <- sum(solution * costs) # from formula

print(total_cost)
