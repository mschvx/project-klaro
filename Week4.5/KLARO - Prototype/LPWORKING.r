# --- Greenvale LP Solver (final corrected version, with <=20 constraint) ---

if (!require(jsonlite)) install.packages("jsonlite", repos='https://cloud.r-project.org')
if (!require(lpSolve)) install.packages("lpSolve", repos='https://cloud.r-project.org')
library(jsonlite)
library(lpSolve)

# === LOAD JSON ===
json_path <- "ToReceive.json"  # make sure the file exists in your working directory
data <- fromJSON(json_path, simplifyVector = FALSE)

projects <- data$projects
n <- length(projects)

# === EXTRACT COSTS + REDUCTION DATA ===
costs <- numeric(n)
reductions <- matrix(0, nrow = 10, ncol = n)

for (i in seq_len(n)) {
  d <- unlist(projects[[i]]$data)
  if (length(d) != 11) stop(paste0("Project ", i, " data must be length 11."))
  costs[i] <- d[1]
  reductions[, i] <- d[2:11]
}

# === GOALS ===
targets <- unlist(data$goals)
if (length(targets) != 10) stop("Expected 10 target values in 'goals' field.")

# === ADD UPPER LIMIT CONSTRAINTS (x_i <= 20) ===
const.mat <- rbind(reductions, diag(n))
const.dir <- c(rep(">=", 10), rep("<=", n))
const.rhs <- c(targets, rep(20, n))

# === SOLVE LP ===
result <- lp(
  direction = "min",
  objective.in = costs,
  const.mat = const.mat,
  const.dir = const.dir,
  const.rhs = const.rhs
)

# === OUTPUT ===
cat("\n========== GREENVALE POLLUTION OPTIMIZATION ==========\n")
if (result$status != 0) {
  cat("❌ No feasible solution found (status:", result$status, ")\n")
} else {
  cat("✅ Optimal total cost: $", format(round(result$objval, 2), big.mark=","), "\n\n", sep = "")
  sol <- result$solution
  output <- data.frame(
    Project = sapply(projects, function(x) x$name),
    Units = round(sol, 6),
    CostPerUnit = costs,
    TotalCost = round(sol * costs, 2)
  )
  output <- output[order(-output$Units), ]
  print(output, row.names = FALSE)
  cat("\n--- Active Projects (Units > 0) ---\n")
  print(subset(output, Units > 0), row.names = FALSE)
}
cat("=======================================================\n")
