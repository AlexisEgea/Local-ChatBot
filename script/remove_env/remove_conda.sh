#!/bin/bash

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
conda_env_name="$(basename "$project_directory")"

source "$project_directory/script/utils/conda_loader.sh"

echo "-----------------------------------------------------------------------------"
echo "|                         Remove Environment (conda)                        |"
echo "| Author : Alexis EGEA                                                      |"
echo "-----------------------------------------------------------------------------"
echo

echo "Project directory: $project_directory"
echo "Conda environment name: $conda_env_name"
echo

echo "_____________________________________________________________________________"
echo "Checking Conda..."
if load_conda; then
  conda_version=$(conda --version 2>&1 | awk '{print $2}')
  echo "Conda is installed: $conda_version"
else
  echo "Conda was not found."
  echo "Please install Conda or add it to PATH, then rerun this script."
  read -p "Press any key to close the terminal window..."
  exit 1
fi

if ! conda env list | awk '{print $1}' | grep -Fx "$conda_env_name" >/dev/null; then
  echo "No Conda environment found with name: $conda_env_name"
  read -p "Press any key to close the terminal window..."
  exit 0
fi

if [ "$CONDA_DEFAULT_ENV" = "$conda_env_name" ]; then
  echo "Active project Conda environment detected in your terminal."
  echo "Cannot remove the currently active Conda environment."
  echo "Run 'conda deactivate' in your current terminal, then rerun this script."
  read -p "Press any key to close the terminal window..."
  exit 1
fi

read -p "Do you want to remove this conda env? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Operation cancelled."
  read -p "Press any key to close the terminal window..."
  exit 0
fi

conda env remove -n "$conda_env_name" -y

if conda env list | awk '{print $1}' | grep -Fx "$conda_env_name" >/dev/null; then
  echo "Failed to remove Conda environment."
  read -p "Press any key to close the terminal window..."
  exit 1
fi

echo "Conda environment removed successfully."
echo
read -p "Press any key to close the terminal window..."
