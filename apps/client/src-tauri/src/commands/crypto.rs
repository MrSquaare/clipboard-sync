use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use tauri::State;
use thiserror::Error;

use crate::crypto::{decrypt, encrypt, generate_salt};
use crate::states::AppState;

#[derive(Error, Debug)]
pub enum CryptoCommandError {
    #[error("invalid base64: {0}")]
    Base64Decode(String),
    #[error("invalid utf8")]
    Utf8,
    #[error("crypto error: {0}")]
    Crypto(String),
}

impl From<CryptoCommandError> for String {
    fn from(err: CryptoCommandError) -> Self {
        err.to_string()
    }
}

#[derive(Serialize, Deserialize)]
pub struct EncryptedPayload {
    pub iv: String,
    pub ciphertext: String,
    pub salt: String,
}

#[tauri::command]
pub fn encrypt_message(
    plaintext: String,
    state: State<'_, AppState>,
) -> Result<EncryptedPayload, String> {
    let secret = state.get_secret().map_err(|e| e.to_string())?;
    let salt = generate_salt();

    let (ciphertext, iv) =
        encrypt(&secret, &salt, plaintext.as_bytes()).map_err(|e| e.to_string())?;

    Ok(EncryptedPayload {
        iv: STANDARD.encode(&iv),
        ciphertext: STANDARD.encode(&ciphertext),
        salt: STANDARD.encode(&salt),
    })
}

#[tauri::command]
pub fn decrypt_message(
    payload: EncryptedPayload,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let secret = state.get_secret().map_err(|e| e.to_string())?;

    let salt = STANDARD
        .decode(&payload.salt)
        .map_err(|e| CryptoCommandError::Base64Decode(e.to_string()).to_string())?;
    let iv = STANDARD
        .decode(&payload.iv)
        .map_err(|e| CryptoCommandError::Base64Decode(e.to_string()).to_string())?;
    let ciphertext = STANDARD
        .decode(&payload.ciphertext)
        .map_err(|e| CryptoCommandError::Base64Decode(e.to_string()).to_string())?;

    let plaintext = decrypt(&secret, &salt, &ciphertext, &iv).map_err(|e| e.to_string())?;

    String::from_utf8(plaintext).map_err(|_| CryptoCommandError::Utf8.to_string())
}
