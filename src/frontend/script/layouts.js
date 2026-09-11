/**
 * Conversation layout ids and field definitions.
 */

export const LAYOUTS = {
  user: {
    id: "user",
    label: "Single bar",
    fields: [{ name: "user", placeholder: "Type a message...", rows: 1 }],
  },
  "system-user": {
    id: "system-user",
    label: "Two bars",
    fields: [
      { name: "system", placeholder: "System prompt...", rows: 2 },
      { name: "user", placeholder: "Type a message...", rows: 1 },
    ],
  },
  cgse: {
    id: "cgse",
    label: "Four bars",
    fields: [
      { name: "context", placeholder: "Context...", rows: 2 },
      { name: "goal", placeholder: "Goal...", rows: 2 },
      { name: "source", placeholder: "Source...", rows: 2 },
      { name: "expectation", placeholder: "Expectation...", rows: 2 },
    ],
  },
};

export const DEFAULT_LAYOUT = "user";
export const DEFAULT_CHOOSE_MODE = "default";
