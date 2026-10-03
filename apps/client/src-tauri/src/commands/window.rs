use tauri::AppHandle;

use crate::window::{focus_main_window, hide_main_window};

#[tauri::command]
pub fn show_window(app: AppHandle) {
    focus_main_window(&app);
}

#[tauri::command]
pub fn minimize_window(app: AppHandle) {
    hide_main_window(&app);
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
