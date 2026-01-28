//! Flowent Desktop Application
//!
//! This is the main Tauri library for the Flowent desktop app.
//! It sets up the Tauri runtime with all necessary plugins and commands.

use tauri::Manager;

/// Custom Tauri command to get app version
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Custom Tauri command to get platform info
#[tauri::command]
fn get_platform_info() -> serde_json::Value {
    serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "family": std::env::consts::FAMILY,
    })
}

/// Custom Tauri command to open external URL in default browser
#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

/// Initialize logging
fn init_logging() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_millis()
        .init();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_logging();

    log::info!("Starting Flowent Desktop v{}", env!("CARGO_PKG_VERSION"));

    tauri::Builder::default()
        // Register plugins
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        // Register custom commands
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_platform_info,
            open_external_url,
        ])
        // Setup hook
        .setup(|app| {
            log::info!("App setup complete");

            // Get the main window
            if let Some(window) = app.get_webview_window("main") {
                // Set window title with version
                let version = env!("CARGO_PKG_VERSION");
                let _ = window.set_title(&format!("Flowent AI v{}", version));

                // Show devtools in development
                #[cfg(debug_assertions)]
                {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Flowent Desktop application");
}
