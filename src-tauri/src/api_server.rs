use axum::{
    routing::get,
    Json, Router,
};
use serde::Serialize;

#[derive(Serialize)]
struct OkRes {
    status: String,
}

fn ok() -> Json<OkRes> {
    Json(OkRes { status: "ok".into() })
}

async fn health() -> Json<OkRes> {
    ok()
}

// --- Server startup ---

pub async fn start(_app: tauri::AppHandle<tauri::Wry>) {
    let router = Router::new()
        .route("/health", get(health));

    // Try preferred port, fall back to OS-assigned
    let listener = match tokio::net::TcpListener::bind("127.0.0.1:9376").await {
        Ok(l) => l,
        Err(_) => match tokio::net::TcpListener::bind("127.0.0.1:0").await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[api_server] Failed to bind: {}", e);
                return;
            }
        },
    };

    let port = listener.local_addr().unwrap().port();

    // Write port to data dir so the CLI can find it
    let home = dirs::home_dir().unwrap_or_default();
    let folder = if cfg!(debug_assertions) {
        ".terminator-dev"
    } else {
        ".terminator"
    };
    let port_file = home.join(folder).join("api.port");
    let _ = std::fs::create_dir_all(port_file.parent().unwrap());
    let _ = std::fs::write(&port_file, port.to_string());

    eprintln!("[api_server] Listening on 127.0.0.1:{}", port);

    let _ = axum::serve(listener, router).await;
}
