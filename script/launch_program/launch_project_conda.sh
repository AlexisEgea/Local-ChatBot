#!/bin/bash

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
conda_env_name="$(basename "$project_directory")"

source "$project_directory/script/utils/conda_loader.sh"

echo "-----------------------------------------------------------------------------"
echo "|                       Launch Project (conda)                              |"
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
  echo "Please run installation_requirements_conda.sh first."
  read -p "Press any key to close the terminal window..."
  exit 1
fi

if ! conda env list | awk '{print $1}' | grep -Fx "$conda_env_name" >/dev/null; then
  echo "Conda environment not found: $conda_env_name"
  echo "Please run script/install_requirements/installation_requirements_conda.sh first."
  read -p "Press any key to close the terminal window..."
  exit 1
fi

echo "_____________________________________________________________________________"
echo "Initializing Conda shell hook..."
if ! eval "$(conda shell.bash hook 2>/dev/null)"; then
  echo "Failed to initialize Conda shell hook."
  echo "Run 'conda init bash', reopen the terminal, then rerun this script."
  read -p "Press any key to close the terminal window..."
  exit 1
fi
echo "Conda shell hook initialized."

echo "_____________________________________________________________________________"
echo "Activating Conda environment..."
conda activate "$conda_env_name" || {
  read -p "Failed to activate Conda environment."
  exit 1
}
echo "Conda environment activated."
echo

echo "_____________________________________________________________________________"
echo "Launching project..."
echo
export COMMUNICATION_HOST="${COMMUNICATION_HOST:-127.0.0.1}"
export COMMUNICATION_PORT="${COMMUNICATION_PORT:-8080}"
echo "Host: $COMMUNICATION_HOST"
echo "Port: $COMMUNICATION_PORT"
echo
python "$project_directory/src/communication/main.py"

