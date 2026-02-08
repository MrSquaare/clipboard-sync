use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use argon2::{
    password_hash::rand_core::{OsRng, RngCore},
    Argon2,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum EncryptionError {
    #[error("key derivation failed: {0}")]
    KeyDerivation(String),
    #[error("encryption failed: {0}")]
    Encryption(String),
    #[error("decryption failed: {0}")]
    Decryption(String),
    #[error("invalid nonce length: expected 12 bytes, got {0}")]
    InvalidNonce(usize),
}

pub fn generate_salt() -> Vec<u8> {
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    salt.to_vec()
}

pub fn derive_key(secret: &str, salt: &[u8]) -> Result<Key<Aes256Gcm>, EncryptionError> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(secret.as_bytes(), salt, &mut key)
        .map_err(|e| EncryptionError::KeyDerivation(e.to_string()))?;
    Ok(*Key::<Aes256Gcm>::from_slice(&key))
}

pub fn encrypt(
    secret: &str,
    salt: &[u8],
    plaintext: &[u8],
) -> Result<(Vec<u8>, Vec<u8>), EncryptionError> {
    let key = derive_key(secret, salt)?;
    let cipher = Aes256Gcm::new(&key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| EncryptionError::Encryption(e.to_string()))?;

    Ok((ciphertext, nonce_bytes.to_vec()))
}

pub fn decrypt(
    secret: &str,
    salt: &[u8],
    ciphertext: &[u8],
    nonce: &[u8],
) -> Result<Vec<u8>, EncryptionError> {
    if nonce.len() != 12 {
        return Err(EncryptionError::InvalidNonce(nonce.len()));
    }

    let key = derive_key(secret, salt)?;
    let cipher = Aes256Gcm::new(&key);
    let nonce = Nonce::from_slice(nonce);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| EncryptionError::Decryption(e.to_string()))
}
