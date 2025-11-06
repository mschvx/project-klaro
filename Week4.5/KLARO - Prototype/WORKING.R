# ============================= #
# PART A. LOADING THE JSON FILE #
# ============================= #

library(jsonlite)

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

# B.1. Get pollutants
# pmat rows: each project -> [cost, CO2, NOx, SO2, PM2.5, CH4, VOC, CO, NH3, BC, N2O]
costs <- as.numeric(pmat[, 1])
reductions <- t(pmat[, -1, drop = FALSE])   # 10 x n (pollutants x projects)

# B.2. Add goals to RHS
goals <- as.numeric(unlist(data$goals))  # length 10

# ============================ #
# PART C. BUILD TWO-PHASE TABLEAU
# ============================ #

# We will build constraints as follows:
# - For each pollutant j (>= constraint): sum_j (a_ji * x_i) >= goal_j
#   convert to: sum a_ji * x_i - s_j + a_j = goal_j
#   (s_j = surplus >=0, a_j = artificial >=0)
# - For each variable i upper bound: x_i <= 20
#   convert to: x_i + ub_s_i = 20  (ub_s_i is slack for ub, basic initially)
#
# Unknowns order (columns): [ x1..xn | s1..sm (surplus) | a1..am (artificial) | ub_s1..ub_sn | RHS ]
# m = 10 pollutants, n = number of projects

n <- ncol(reductions)   # number of projects (variables x_i)
m <- nrow(reductions)   # number of pollutant constraints (should be 10)

# ========================== NEW/CHANGED: build coefficient matrix for constraints
#=========================
# pollutant rows (m rows): coeffs for x, -1 for surplus, +1 for artificial, 0 for ub slacks, RHS = goals
pollutant_rows <- matrix(0, nrow = m, ncol = n + m + m + n + 1) # +1 for RHS

for (j in 1:m) {
  # x columns
  pollutant_rows[j, 1:n] <- reductions[j, ]
  # surplus s_j placed after x columns:
  pollutant_rows[j, n + j] <- -1
  # artificial a_j after surplus block:
  pollutant_rows[j, n + m + j] <- 1
  # RHS
  pollutant_rows[j, n + m + m + n + 1] <- goals[j]
}

# ub constraint rows (n rows): xi + ub_s_i = 20
ub_rows <- matrix(0, nrow = n, ncol = n + m + m + n + 1)
for (i in 1:n) {
  ub_rows[i, i] <- 1                 # x_i coefficient
  ub_rows[i, n + m + m + i] <- 1     # ub_slack_i (index after x, surplus, artificial)
  ub_rows[i, n + m + m + n + 1] <- 20  # RHS = 20
}

# Combine all constraint rows
all_rows <- rbind(pollutant_rows, ub_rows)

# convenient table (without RHS column separated)
tableau <- all_rows

# ========================== NEW/CHANGED: create Phase I objective row (minimize sum of artificials)
#=========================
# Build Phase I cost vector c (length = number of variable columns, before RHS)
num_var_cols <- n + m + m + n
c_phase1 <- rep(0, num_var_cols)
# artificial columns indices:
artificial_indices <- (n + m + 1):(n + m + m)
c_phase1[artificial_indices] <- 1

# compute reduced-cost row for Phase I: c - sum(c_B * row_B)
# Basic variables initially: artificials are basic in pollutant_rows (rows 1..m),
# ub_slacks are basic in ub_rows (rows m+1 .. m+n)
# build phase1 reduced row:
phase1_row_coeffs <- c_phase1  # start with c
phase1_rhs <- 0

# subtract c_B * row_B for each basic row (c_B = cost of that basic variable)
# pollutant rows basic variable: artificial with cost 1
for (j in 1:m) {
  row_vec <- tableau[j, 1:num_var_cols]
  cb <- 1  # artificial cost
  phase1_row_coeffs <- phase1_row_coeffs - cb * row_vec
  phase1_rhs <- phase1_rhs - cb * tableau[j, num_var_cols + 1]
}
# ub rows basic variable: ub_slack with cost 0 -> no subtraction needed (cb = 0)
# but include them for completeness
for (i in 1:n) {
  row_idx <- m + i
  # cb is 0 for ub_slack
  # phase1_row_coeffs <- phase1_row_coeffs - 0 * tableau[row_idx, 1:num_var_cols]
  # phase1_rhs <- phase1_rhs - 0 * tableau[row_idx, num_var_cols + 1]
}

# compose full Phase I objective row (coeffs + RHS)
phase1_full <- c(phase1_row_coeffs, phase1_rhs)

# Append objective row at bottom (Phase I)
tableau_with_obj <- cbind(tableau[, 1:num_var_cols], tableau[, num_var_cols + 1])
tableau_with_obj <- rbind(tableau_with_obj, phase1_full)

# Name columns & rows (helpful for debugging)
col_names <- c(paste0("x", 1:n),
               paste0("s", 1:m),
               paste0("a", 1:m),
               paste0("ub_s", 1:n),
               "RHS")
row_names <- c(paste0("p", 1:m), paste0("ub", 1:n), "Phase1")
colnames(tableau_with_obj) <- col_names
rownames(tableau_with_obj) <- row_names

# ============================ #
# PART D. SIMPLEX PIVOTING FN  #
# ============================ #

# We'll modify your Simplex function to operate on this tableau format.
# It expects last column = RHS, last row = objective (reduced costs), minimization:
# - continue while there exists negative entry in objective row (tolerance used)
# - Bland's rule not implemented, but pivot selection uses most-negative reduced cost,
#   and minimum positive ratio for pivot row.

SimplexPivot <- function(tab, tol = 1e-9, verbose = FALSE) {
  tab <- as.matrix(tab)
  while (TRUE) {
    row_num <- nrow(tab)
    col_num <- ncol(tab)
    obj_row <- tab[row_num, 1:(col_num-1)]
    if (!any(obj_row < -tol)) break
    pivot_col <- which.min(obj_row)  # most negative
    # compute ratios
    ratios <- rep(Inf, row_num - 1)
    for (r in 1:(row_num - 1)) {
      a <- tab[r, pivot_col]
      if (a > tol) ratios[r] <- tab[r, col_num] / a
    }
    if (all(is.infinite(ratios))) stop("LP is unbounded (no positive entries in pivot column).")
    pivot_row <- which.min(ratios)
    pivot_elem <- tab[pivot_row, pivot_col]
    # normalize pivot row
    tab[pivot_row, ] <- tab[pivot_row, ] / pivot_elem
    # eliminate
    for (r in 1:nrow(tab)) {
      if (r == pivot_row) next
      factor <- tab[r, pivot_col]
      if (abs(factor) > tol) {
        tab[r, ] <- tab[r, ] - factor * tab[pivot_row, ]
      }
    }
    if (verbose) {
      cat("Pivot at row", pivot_row, "col", pivot_col, "\n")
      print(tab)
    }
  }
  return(tab)
}

# ============================ #
# PART E. RUN PHASE I
# ============================ #

cat("Running Phase I (remove artificials)...\n")
phase1_tab <- SimplexPivot(tableau_with_obj, tol = 1e-8)

# Phase I objective value is in last row RHS
phase1_obj_val <- phase1_tab[nrow(phase1_tab), ncol(phase1_tab)]
cat("Phase I objective value (should be ~0 if feasible):", phase1_obj_val, "\n")

if (abs(phase1_obj_val) > 1e-6) {
  stop("Infeasible problem: artificial variables could not be removed (Phase I objective > 0).")
}

# ========================== NEW/CHANGED: Remove artificial columns for Phase II
#=========================
# Find artificial columns by name (they're "a1..am")
art_cols <- grep("^a[0-9]+", colnames(phase1_tab))
if (length(art_cols) > 0) {
  # But if any artificial column still has nonzero entries (numerical noise), it's okay to drop
  phase2_tab <- phase1_tab[, -art_cols, drop = FALSE]
} else {
  phase2_tab <- phase1_tab
}

# ========================== NEW/CHANGED: Build Phase II objective row (original costs)
#=========================
# current_col_names excluding RHS
current_col_names <- colnames(phase2_tab)
num_cols_phase2 <- ncol(phase2_tab)
num_coeffs_phase2 <- num_cols_phase2 - 1

# Build base cost vector aligned with current columns (exclude RHS)
base_costs <- rep(0, num_coeffs_phase2)
for (k in 1:num_coeffs_phase2) {
  nm <- current_col_names[k]
  if (grepl("^x", nm)) {
    idx <- as.integer(sub("^x", "", nm))
    base_costs[k] <- costs[idx]
  } else {
    base_costs[k] <- 0
  }
}
phase2_obj_rhs <- 0
phase2_obj_row <- c(base_costs, phase2_obj_rhs)

# Convert to reduced cost by subtracting cb * row_B for current basic variables
# identify basic columns (unit vectors) in tab body (exclude last row objective)
tab_body <- phase2_tab[1:(nrow(phase2_tab)-1), 1:num_coeffs_phase2, drop = FALSE]
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
# subtract c_B * row_B
reduced_row <- phase2_obj_row
for (i in seq_along(basic_cols)) {
  col_idx <- basic_cols[i]
  row_idx <- basic_rows[i]
  var_name <- current_col_names[col_idx]
  if (grepl("^x", var_name)) {
    cb <- costs[as.integer(sub("^x", "", var_name))]
  } else {
    cb <- 0
  }
  if (cb != 0) {
    reduced_row[1:num_coeffs_phase2] <- reduced_row[1:num_coeffs_phase2] - cb * phase2_tab[row_idx, 1:num_coeffs_phase2]
    reduced_row[num_coeffs_phase2 + 1] <- reduced_row[num_coeffs_phase2 + 1] - cb * phase2_tab[row_idx, num_coeffs_phase2 + 1]
  }
}

# overwrite last row with reduced objective row
phase2_tab[nrow(phase2_tab), ] <- reduced_row
rownames(phase2_tab)[nrow(phase2_tab)] <- "Phase2"

cat("Starting Phase II (optimize real objective)...\n")

# ============================ #
# PART F. RUN PHASE II
# ============================ #
final_tab <- SimplexPivot(phase2_tab, tol = 1e-8)

# Extract solution: find basic variables (unit columns) and RHS values
solution <- rep(0, n)  # x1..xn
tab_body_final <- final_tab[1:(nrow(final_tab)-1), 1:(ncol(final_tab)-1), drop = FALSE]
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

total_cost <- sum(solution * costs)

# ============================ #
# PART G. PRINT RESULTS
# ============================ #
cat("\n================== FINAL RESULT ==================\n")
cat("Minimum total cost (Phase II): $", format(round(total_cost, 2), big.mark=","), "\n\n", sep = "")

out <- data.frame(Project = sapply(projects, function(x) x$name),
                  Units = round(solution, 8),
                  CostPerUnit = costs,
                  TotalCost = round(solution * costs, 2),
                  stringsAsFactors = FALSE)
out <- out[order(-out$Units), ]
print(out, row.names = FALSE)
cat("\nActive projects (Units > 0):\n")
print(subset(out, Units > 0), row.names = FALSE)
cat("==================================================\n")
