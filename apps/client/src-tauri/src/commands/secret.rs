use keyring::Entry;
use tauri::State;
use thiserror::Error;

use crate::states::AppState;

const SERVICE_NAME: &str = "clipboard-sync";
const USERNAME: &str = "default";

#[derive(Error, Debug)]
pub enum SecretCommandError {
    #[error("keyring error: {0}")]
    Keyring(#[from] keyring::Error),
    #[error("lock acquisition failed")]
    LockFailed,
}

impl From<SecretCommandError> for String {
    fn from(err: SecretCommandError) -> Self {
        err.to_string()
    }
}

#[tauri::command]
pub fn set_secret(secret: String, state: State<'_, AppState>) -> Result<(), String> {
    state.set_secret(secret).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unset_secret(state: State<'_, AppState>) -> Result<(), String> {
    state.clear_secret().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_secret(secret: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, USERNAME).map_err(SecretCommandError::from)?;

    entry
        .set_password(&secret)
        .map_err(SecretCommandError::from)?;

    Ok(())
}

#[tauri::command]
pub fn load_secret() -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, USERNAME).map_err(SecretCommandError::from)?;
    let password = entry.get_password().map_err(SecretCommandError::from)?;

    Ok(password)
}

#[tauri::command]
pub fn clear_secret() -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, USERNAME).map_err(SecretCommandError::from)?;

    entry
        .delete_credential()
        .map_err(SecretCommandError::from)?;

    Ok(())
}
