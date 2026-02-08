#[tauri::command]
pub fn get_device_name() -> String {
    crate::platform::get_device_name()
}
