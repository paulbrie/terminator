use serde::Serialize;
use std::fmt;

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct AppError {
    pub message: String,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError { message: s }
    }
}

impl From<&str> for AppError {
    fn from(s: &str) -> Self {
        AppError {
            message: s.to_string(),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError {
            message: e.to_string(),
        }
    }
}
