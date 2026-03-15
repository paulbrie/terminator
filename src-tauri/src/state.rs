use portable_pty::{Child, MasterPty};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub agent_type: String,
    pub label: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub working_directory: Option<String>,
}

pub struct AgentHandle {
    pub id: String,
    pub config: AgentConfig,
    pub child: Box<dyn Child + Send>,
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
}

pub struct AppState {
    pub agents: Mutex<HashMap<String, AgentHandle>>,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            agents: Mutex::new(HashMap::new()),
        }
    }
}
