# Local ChatBot

## Definition

This project is a local chat interface for talking to language models:

<img src="./data/documentation/chat_ui.png" alt="Local ChatBot workspace">

## Project

The app is a fully transparent workspace: You can pick the conversation bar, the provider and the companies associated with their models and its parameters, then keep questions and replies on your machine.

## Features:

### Providers

Providers list models from each company and expose what the UI can show (parameters, pricing, and so on).

- `Hugging Face`: Hub models. A token is required when the catalog or inference needs it.
- `OpenAI`: paid chat models, with pricing, token counts, and cost when the API returns them.
- `Local`: a model folder on disk, loaded with Transformers.
- `Test`: a fixed markdown reply, used to exercise the UI without a remote model.

Click the **Local ChatBot** header to expand the workspace and open the Model panel:

<img src="./data/documentation/chat_model.png" alt="Model panel">

### Prompt layouts

Public chat UIs often hide how the prompt is structured. Here you can choose a layout so each field has a clear role.

- `Default`: a single user message.
- `Role-Based Prompt`: a system instruction and a user message.
- `CGSE`: Context, Goal, Source, and Expectation packed into one user turn.

To switch layout, click the area between the thread and the prompt bar (Chat Bar mode) and pick a bar.

<!-- Screenshot to add: layout picker. -->

### Conversation history

Like other chat UIs, you can start a new chat and keep past threads. Conversations are stored locally as JSON under `data/history/`.

- `New chat`: start an empty conversation.
- `History`: list saved threads. A conversation is written after the first completed exchange.
- `Title generation`: a first title from the first user question and assistant reply, then a final title after the second exchange (using the first turn as well). Titles are generated with `openai/gpt-oss-20b`.
- `History actions` (right-click a saved chat):
  1. Rename the conversation title.
  2. Delete the conversation.

<!-- Screenshot to add: History rail. -->

### Chat Mode

Chat Mode is the right-hand rail.

- `Chat Bar`: pick the prompt layout from the conversation column.
- `Default`: pin one layout for every new message.
- `Theme`: Light, Dark, or Custom (page background and liquid glass colors).

### Conversation

The thread is the list of messages in the current chat.

- `Send`: submit the current bar and wait for a reply.
- `Stop`: halt generation or the typewriter from the send control (square while a run is in flight).
- `Copy`: copy a message (right-click).
- `Edit`: change a user or system bubble and resend (right-click).
- `Delete`: remove a user turn and the paired system / assistant messages (right-click on a user bubble).
- `Information`: show the Model snapshot for an assistant reply (parameters, and pricing or tokens when available).

API keys (Hugging Face, OpenAI) are set from the header sidebar and stored in `infra/env`.

## Stack

- Python 3.11
- Conda (environment named after the project folder)
- FastAPI + Uvicorn
- WebSockets (stop an in-flight run)
- OpenAI Python SDK
- Hugging Face Hub + Transformers + PyTorch
- Vanilla JS modules and CSS (liquid glass UI)
- KaTeX (assistant math)
- `debugpy` (Cursor / VS Code, `Python Communication Server`)

## Project Structure

```text
Local-ChatBot/
├── infra/
│   ├── env
│   └── requirements.txt
├── script/
│   ├── install_requirements/
│   │   └── installation_requirements_conda.sh
│   ├── launch_program/
│   │   └── launch_project_conda.sh
│   ├── remove_env/
│   │   └── remove_conda.sh
│   └── utils/
│       └── conda_loader.sh
├── src/
│   ├── backend/
│   │   ├── api_key/
│   │   ├── history/
│   │   └── model/
│   ├── communication/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── utils/
│   │   │   └── dataclass/
│   │   └── ws_management/
│   └── frontend/
│       ├── index.html
│       ├── script/
│       │   ├── main.js
│       │   ├── api/
│       │   ├── conversation/
│       │   └── workspace-sidebar/
│       └── style/
│           ├── main.css
│           ├── theme/
│           ├── conversation/
│           └── workspace-sidebar/
└── .vscode/
    └── launch.json
```

## Installation

Install [Conda](https://www.anaconda.com/download), then from the project root (Git Bash on Windows):

```bash
./script/install_requirements/installation_requirements_conda.sh
```

The script creates a Conda environment with Python 3.11 and installs `infra/requirements.txt`.

Optional GPU PyTorch (see the comment in `infra/requirements.txt`):

```bash
pip install torch==2.14.0 --index-url https://download.pytorch.org/whl/cu130
```

## Quick Start

### Conda launch

From the project root:

```bash
./script/launch_program/launch_project_conda.sh
```

The communication server listens on `http://127.0.0.1:8080` by default (`COMMUNICATION_HOST`, `COMMUNICATION_PORT`). Open that URL in the browser.

Hugging Face and OpenAI keys are set from the header (`API key`), not from the shell.

### Conda cleanup

Remove the project environment:

```bash
./script/remove_env/remove_conda.sh
```

Deactivate the environment first if it is the one currently active in the terminal.

## VS Code / Cursor Debug

The `.vscode/launch.json` file includes:

- `Python Communication Server`

It starts `src/communication/main.py` with `infra/env` and port `8080`. Adjust the Conda `python` path if the environment is not under `anaconda3/envs/Local-ChatBot`.

## Contact Information

For inquiries or feedback, please contact me at [alexisegea@outlook.com](mailto:alexisegea@outlook.com).

## Copyright

© 2026 Alexis EGEA. All Rights Reserved.
