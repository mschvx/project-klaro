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
pollutant_matrix <- t(pmat[, -1, drop = FALSE])

# B.2. Add goals to RHS
goals <- as.numeric(unlist(data$goals))
pollutant_with_rhs <- cbind(pollutant_matrix, goals)

# B.3. Add Z = 1 on the bottom rightmost
cost_row <- c(as.numeric(pmat[, 1]), 1)

# B.4. Combine and remove labels
final_matrix <- rbind(pollutant_with_rhs, cost_row)
final_matrix <- unname(as.matrix(final_matrix))

# ============================ #
# PART C. TRANSPOSE THE MATRIX #
# ============================ #

# C.1. Transpose <3
final_matrix <- t(final_matrix)

print(final_matrix)

# ======================================= #
# PART D. CONSTRAINTS AND INITIAL TABLEAU #
# ======================================= #

# D.1. Get dimensions
rows <- nrow(final_matrix) - 1
cols <- ncol(final_matrix) - 1

# D.2. Create identity matrix for slack 
slack_matrix <- diag(rows)

# D.3. Combine coefficients, slack variables, and RHS
tableau <- cbind(final_matrix[1:rows, 1:cols], slack_matrix, 0, final_matrix[1:rows, ncol(final_matrix)])

# D.4. Add the cost row and negate
z_row <- c(final_matrix[nrow(final_matrix), 1:cols], rep(0, rows), 1, 0)
z_row[1:cols] <- -z_row[1:cols]

# D.6. Combine all rows and remove labels
tableau <- rbind(tableau, z_row)
tableau <- unname(as.matrix(tableau))

# Now that that's done I can FINALLY copy paste my code from the Simplex exercise omg 
# this simplex code is og 100% made by me during lab class hours cuz i thought akala ko na during class hours
# ipapasa pero hnde pala 

# ==================== #
# PART E. MINIMIZATION #
# ==================== #

