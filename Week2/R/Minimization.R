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
project_matrix <- do.call(rbind, lapply(project_list, function(x) x[["data"]]))

# If only one project, set row and column names correctly
if (length(project_list) == 1) {
  full_matrix <- matrix(project_list[[1]][["data"]], nrow=1, ncol=length(columns))
  rownames(full_matrix) <- project_list[[1]][["name"]]
  colnames(full_matrix) <- columns
  print(as.data.frame(full_matrix))
} else {
  constraints <- project_matrix[, 2:ncol(project_matrix), drop=FALSE]
  rownames(constraints) <- sapply(project_list, function(x) x[["name"]])
  colnames(constraints) <- columns[2:length(columns)]

  objective <- project_matrix[, 1]
  names(objective) <- rownames(constraints)

  full_matrix <- rbind(constraints, Cost=objective)
  print(as.data.frame(full_matrix))
}

# Handle single or multiple projects
if (is.list(json_data$projects) && !is.data.frame(json_data$projects)) {
  # Multiple projects
  project_list <- json_data$projects
} else {
  # Single project
  project_list <- list(json_data$projects)
}

# Extract columns and project data
columns <- json_data$columns
project_matrix <- do.call(rbind, lapply(project_list, function(x) x[["data"]]))

# Constraints: all except cost (first column)
constraints <- project_matrix[, 2:ncol(project_matrix), drop=FALSE]
rownames(constraints) <- sapply(json_data$projects, function(x) x$name)
rownames(constraints) <- sapply(project_list, function(x) x$name)
colnames(constraints) <- columns[2:length(columns)]

# Objective function: cost (first column)
objective <- project_matrix[, 1]
names(objective) <- rownames(constraints)

# Combine constraints and objective function into one matrix
full_matrix <- rbind(constraints, Cost=objective)
print(full_matrix)


#============================================================================================
# Function that starts the Minimization Process
Minimize <- function(tableau) {
  col_num <- ncol(tableau)
  row_num <- nrow(tableau)
  
  while (TRUE) {
    # Check if last row has negatives to continue/start looping
    last_row <- tableau[row_num,]
    has_negative <- any(last_row < 0)
    
    # If there are no more negative values, break
    if (has_negative == FALSE) {
      break
    }
    
    # === First, get the PIVOT COLUMN ===
    smallest_number_for_column <- min(last_row[1:(col_num - 1)])
    pivot_column <- which(last_row == smallest_number_for_column)[1]
    
    # === Second, get the TEST RATIO ===
    test_ratio <- rep(Inf, row_num - 1)
    # Compute ratio only for positive pivot column entries
    for (i in 1:(row_num - 1)) {
      if (tableau[i, pivot_column] > 0) {
        test_ratio[i] <- tableau[i, col_num] / tableau[i, pivot_column]
      }
    }
    
    # === Third, get the PIVOT ROW ===
    pivot_row_index <- which.min(test_ratio)
    pivot_row <- pivot_row_index
    
    # === Fourth, get the PIVOT ELEMENT ===
    pivot_element <- tableau[pivot_row, pivot_column]
    
    # === Fifth, processing the table
    
    # Solve for the normalized pivot row
    normalized_pivot_row <- tableau[pivot_row,] /pivot_element
    tableau[pivot_row, ] = normalized_pivot_row
    
    # Loop through each row and eliminate
    for (i in 1:nrow(tableau)) {
      # If it is the current row, skip it
      if (i == pivot_row) {
        next
      }
      
      # Getting R and C
      R <- tableau[i,]
      C <- tableau[i, pivot_column]
      
      # Elimination formula
      new_row <- R - ((normalized_pivot_row) * C)
      
      # Putting the new row into the tableau
      tableau[i,] = new_row
      
    }
  }
  
  Z <- tableau[row_num, col_num]
  
  # Minimization
  my_solution <- tableau[row_num, ]
  keep_cols <- grep("^(S|x)[0-9]+|Z$", colnames(tableau), value = TRUE)
  my_solution <- my_solution[keep_cols]
  my_solution["Z"] <- Z
  
  return(list(finalTableau = tableau, basicSolution = my_solution, Z = Z))
}