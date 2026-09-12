/**
 * Conversation layout ids and field definitions.
 */

export const LAYOUTS = {
  user: {
    id: "user",
    label: "Default",
    fields: [{ name: "user", placeholder: "Type a message", rows: 1 }],
  },
  "system-user": {
    id: "system-user",
    label: "Role-Based Prompt",
    fields: [
      { name: "system", placeholder: "System Instruction", rows: 2 },
      { name: "user", placeholder: "User Message", rows: 1 },
    ],
  },
  cgse: {
    id: "cgse",
    label: "CGSE",
    fields: [
      { name: "context", placeholder: "Context", rows: 2 },
      { name: "goal", placeholder: "Goal", rows: 2 },
      { name: "source", placeholder: "Source", rows: 2 },
      { name: "expectation", placeholder: "Expectation", rows: 2 },
    ],
  },
};

export const DEFAULT_LAYOUT = "user";
export const DEFAULT_CHOOSE_MODE = "picker";
