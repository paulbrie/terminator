import type { AgentType, AgentConfig } from "../types/agent";

export interface AgentTypeDefinition {
  type: AgentType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultCommand: string;
  defaultArgs: string[];
  defaultEnv: Record<string, string>;
  configurable: boolean;
}

export const AGENT_REGISTRY: Record<AgentType, AgentTypeDefinition> = {
  shell: {
    type: "shell",
    label: "Shell",
    description: "Interactive shell session",
    icon: ">_",
    color: "#9ece6a",
    defaultCommand: "/bin/zsh",
    defaultArgs: ["-l"],
    defaultEnv: {},
    configurable: false,
  },
  claude: {
    type: "claude",
    label: "Claude",
    description: "Claude AI agent via CLI",
    icon: "CL",
    color: "#bb9af7",
    defaultCommand: "claude",
    defaultArgs: [],
    defaultEnv: {},
    configurable: true,
  },
  gpt: {
    type: "gpt",
    label: "GPT",
    description: "OpenAI GPT agent",
    icon: "GP",
    color: "#9ece6a",
    defaultCommand: "chatgpt",
    defaultArgs: [],
    defaultEnv: {},
    configurable: true,
  },
  custom: {
    type: "custom",
    label: "Custom",
    description: "Custom command or script",
    icon: "CS",
    color: "#e0af68",
    defaultCommand: "",
    defaultArgs: [],
    defaultEnv: {},
    configurable: true,
  },
};

export function createAgentConfig(
  type: AgentType,
  overrides?: Partial<AgentConfig>
): AgentConfig {
  const def = AGENT_REGISTRY[type];
  return {
    agent_type: type,
    label: overrides?.label ?? def.label,
    command: overrides?.command ?? def.defaultCommand,
    args: overrides?.args ?? [...def.defaultArgs],
    env: overrides?.env ?? { ...def.defaultEnv },
    working_directory: overrides?.working_directory,
  };
}

export function getAgentDef(type: AgentType): AgentTypeDefinition {
  return AGENT_REGISTRY[type];
}
