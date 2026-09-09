#!/bin/bash

# Ensure "conda" is available even in non-interactive shells.
load_conda() {
  if command -v conda &>/dev/null; then
    return 0
  fi

  for conda_sh in \
    "$HOME/anaconda3/etc/profile.d/conda.sh" \
    "$HOME/miniconda3/etc/profile.d/conda.sh"
  do
    if [ -f "$conda_sh" ]; then
      # shellcheck source=/dev/null
      source "$conda_sh"
      break
    fi
  done

  if command -v conda &>/dev/null; then
    return 0
  fi

  if [ -n "$CONDA_EXE" ] && [ -f "$CONDA_EXE" ]; then
    eval "$("$CONDA_EXE" shell.bash hook 2>/dev/null)"
  fi

  command -v conda &>/dev/null
}