#!/bin/bash

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
python_version="3.11"
conda_env_name="$(basename "$project_directory")"

source "$project_directory/script/utils/conda_loader.sh"

echo "-----------------------------------------------------------------------------"
echo "|                     Installation Requirements (Conda)                     |"
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
  echo "Conda is not installed."
  echo "Download it here: https://www.anaconda.com/download"
  read -p "Script stopped. Please install the missing prerequisite and rerun the script."
  exit 1
fi

echo "_____________________________________________________________________________"
echo "Initializing Conda shell hook..."
if ! eval "$(conda shell.bash hook 2>/dev/null)"; then
  echo "Failed to initialize Conda shell hook."
  read -p "Run 'conda init bash', reopen the terminal, then rerun this script."
  exit 1
fi
echo "Conda shell hook initialized."

echo "_____________________________________________________________________________"
echo "Creating Conda environment..."
if conda env list | awk '{print $1}' | grep -Fx "$conda_env_name" >/dev/null; then
  echo "Conda environment '$conda_env_name' is already created."
else
  conda create -y -n "$conda_env_name" "python=$python_version" || { read -p "Failed to create Conda environment."; exit 1; }
  echo "Conda environment created."
fi

echo "_____________________________________________________________________________"
echo "Activating Conda environment..."
conda activate "$conda_env_name" || { read -p "Failed to activate Conda environment."; exit 1; }
echo "Conda environment activated."

echo "_____________________________________________________________________________"
echo "Installing requirements from requirements.txt..."
python -m pip install -r "$project_directory/infra/requirements.txt" || { read -p "Failed to install dependencies"; exit 1; }
echo "Requirements installed."
echo

echo
echo "Conda project environment is ready."
read -p "Press any key to close the terminal window..."
