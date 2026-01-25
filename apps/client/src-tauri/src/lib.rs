use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::State;

mod crypto;
use crypto::{CryptoManager, CryptoState};

#[derive(Serialize, Deserialize)]
struct EncryptedMessage {
    iv: String,
    ciphertext: String,
    salt: String,
}

#[tauri::command]
fn set_secret(secret: String, state: State<'_, CryptoState>) -> Result<(), String> {
    state.set_secret(secret).map_err(|e| e.to_string())
}

#[tauri::command]
fn encrypt_message(
    payload: String,
    state: State<'_, CryptoState>,
) -> Result<EncryptedMessage, String> {
    let secret = state.get_secret().map_err(|e| e.to_string())?;

    let salt_bytes = CryptoManager::generate_salt();
    let key = CryptoManager::derive_key(&secret, &salt_bytes).map_err(|e| e.to_string())?;
    let (ciphertext, nonce) =
        CryptoManager::encrypt(&key, payload.as_bytes()).map_err(|e| e.to_string())?;

    Ok(EncryptedMessage {
        iv: general_purpose::STANDARD.encode(nonce),
        ciphertext: general_purpose::STANDARD.encode(ciphertext),
        salt: general_purpose::STANDARD.encode(salt_bytes),
    })
}

#[tauri::command]
fn decrypt_message(
    message: EncryptedMessage,
    state: State<'_, CryptoState>,
) -> Result<String, String> {
    let secret = state.get_secret().map_err(|e| e.to_string())?;

    let salt_bytes = general_purpose::STANDARD
        .decode(&message.salt)
        .map_err(|_| "Invalid Salt base64".to_string())?;

    let key = CryptoManager::derive_key(&secret, &salt_bytes).map_err(|e| e.to_string())?;

    let nonce = general_purpose::STANDARD
        .decode(&message.iv)
        .map_err(|_| "Invalid IV base64".to_string())?;
    let ciphertext = general_purpose::STANDARD
        .decode(&message.ciphertext)
        .map_err(|_| "Invalid ciphertext base64".to_string())?;
    let decrypted = CryptoManager::decrypt(&key, &ciphertext, &nonce).map_err(|e| e.to_string())?;

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
        .map_err(|e| {
            eprintln!("Error while running tauri application: {}", e);
        })
        .ok();
}
