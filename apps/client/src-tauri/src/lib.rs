use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::State;

mod crypto;
use crypto::{CryptoManager, CryptoState};

#[derive(Serialize, Deserialize)]
struct EncryptedMessage {
    iv: String,
    ciphertext: String,
}

#[tauri::command]
fn set_secret(secret: String, salt: String, state: State<'_, CryptoState>) -> Result<(), String> {
    // Ideally we shouldn't pass the raw secret to JS at all, but input comes from UI.
    // We derive it immediately and store only the key.
    let key = CryptoManager::derive_key(&secret, &salt);
    let mut state_val = state.0.lock().map_err(|_| "Failed to lock mutex")?;
    *state_val = Some(key);
    Ok(())
}

#[tauri::command]
fn encrypt_message(
    payload: String,
    state: State<'_, CryptoState>,
) -> Result<EncryptedMessage, String> {
    let state_val = state.0.lock().map_err(|_| "Failed to lock mutex")?;
    let key = state_val.as_ref().ok_or("Secret not set")?;

    let (ciphertext, nonce) = CryptoManager::encrypt(key, payload.as_bytes())?;

    Ok(EncryptedMessage {
        iv: general_purpose::STANDARD.encode(nonce),
        ciphertext: general_purpose::STANDARD.encode(ciphertext),
    })
}

#[tauri::command]
fn decrypt_message(
    message: EncryptedMessage,
    state: State<'_, CryptoState>,
) -> Result<String, String> {
    let state_val = state.0.lock().map_err(|_| "Failed to lock mutex")?;
    let key = state_val.as_ref().ok_or("Secret not set")?;

    let nonce = general_purpose::STANDARD
        .decode(&message.iv)
        .map_err(|_| "Invalid IV base64".to_string())?;
    let ciphertext = general_purpose::STANDARD
        .decode(&message.ciphertext)
        .map_err(|_| "Invalid ciphertext base64".to_string())?;

    let decrypted = CryptoManager::decrypt(key, &ciphertext, &nonce)?;
    String::from_utf8(decrypted).map_err(|_| "Decrypted data is not valid UTF-8".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CryptoState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            set_secret,
            encrypt_message,
            decrypt_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
