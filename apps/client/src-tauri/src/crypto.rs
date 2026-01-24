use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use argon2::{password_hash::rand_core::RngCore, Argon2};
use std::sync::Mutex;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Argon2 error: {0}")]
    KeyDerivation(String),
    #[error("Encryption failed: {0}")]
    Encryption(String),
    #[error("Decryption failed: {0}")]
    Decryption(String),
    #[error("State error: {0}")]
    State(String),
}

pub struct CryptoState {
    secret: Mutex<Option<String>>,
}

impl Default for CryptoState {
    fn default() -> Self {
        Self {
            secret: Mutex::new(None),
        }
    }
}

impl CryptoState {
    pub fn set_secret(&self, secret: String) -> Result<(), CryptoError> {
        let mut lock = self
            .secret
            .lock()
            .map_err(|_| CryptoError::State("Failed to acquire lock".into()))?;
        *lock = Some(secret);
        Ok(())
    }

    pub fn get_secret(&self) -> Result<String, CryptoError> {
        let lock = self
            .secret
            .lock()
            .map_err(|_| CryptoError::State("Failed to acquire lock".into()))?;
        lock.clone()
            .ok_or_else(|| CryptoError::State("Secret not set".into()))
    }
}

pub struct CryptoManager;

impl CryptoManager {
    pub fn generate_salt() -> Vec<u8> {
        let mut salt = [0u8; 16];
        OsRng.fill_bytes(&mut salt);
        salt.to_vec()
    }

    pub fn derive_key(secret: &str, salt: &[u8]) -> Result<Key<Aes256Gcm>, CryptoError> {
        let mut key_buffer = [0u8; 32];
        let argon2 = Argon2::default();

        argon2
            .hash_password_into(secret.as_bytes(), salt, &mut key_buffer)
            .map_err(|e| CryptoError::KeyDerivation(e.to_string()))?;

        Ok(*Key::<Aes256Gcm>::from_slice(&key_buffer))
    }

    pub fn encrypt(key: &Key<Aes256Gcm>, data: &[u8]) -> Result<(Vec<u8>, Vec<u8>), CryptoError> {
        let cipher = Aes256Gcm::new(key);
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, data)
            .map_err(|e| CryptoError::Encryption(e.to_string()))?;

        Ok((ciphertext, nonce_bytes.to_vec()))
    }

    pub fn decrypt(
        key: &Key<Aes256Gcm>,
        ciphertext: &[u8],
        nonce: &[u8],
    ) -> Result<Vec<u8>, CryptoError> {
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(nonce);

        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| CryptoError::Decryption(e.to_string()))
    }
}
