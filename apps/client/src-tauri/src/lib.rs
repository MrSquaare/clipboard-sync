use tauri::Emitter;
use tauri_plugin_log::{Target, TargetKind};

mod commands;
mod crypto;
mod platform;
mod states;
mod tray;
pub mod window;

use states::AppState;
use window::focus_main_window;

fn get_log_level() -> log::LevelFilter {
    option_env!("LOG_LEVEL")
        .and_then(|l| l.parse().ok())
        .unwrap_or(log::LevelFilter::Info)
}

fn configure_updater(context: &mut tauri::Context<tauri::Wry>) {
    if let Some(update_server_url) = option_env!("UPDATE_SERVER_URL") {
        if let Some(obj) = context
            .config_mut()
            .plugins
            .0
            .get_mut("updater")
            .and_then(|v| v.as_object_mut())
        {
            obj.insert(
                "endpoints".to_string(),
                serde_json::json!([update_server_url]),
            );
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut context = tauri::generate_context!();
    configure_updater(&mut context);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .level(get_log_level())
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main_window(app);
        }))
        .manage(AppState::default())
        .setup(|app| {
            tray::setup(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::crypto::encrypt_message,
            commands::crypto::decrypt_message,
            commands::platform::get_device_name,
            commands::secret::set_secret,
            commands::secret::unset_secret,
            commands::secret::save_secret,
            commands::secret::load_secret,
            commands::secret::clear_secret,
            commands::window::show_window,
            commands::window::minimize_window,
            commands::window::quit_app,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("close-requested", ());
            }
        })
        .run(context)
        .expect("failed to run app");
}
