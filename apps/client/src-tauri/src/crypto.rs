use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use argon2::{password_hash::rand_core::RngCore, Argon2};
use std::sync::Mutex;

pub struct CryptoState(pub Mutex<Option<Key<Aes256Gcm>>>);

impl Default for CryptoState {
    fn default() -> Self {
        CryptoState(Mutex::new(None))
    }
}

pub struct CryptoManager;

impl CryptoManager {
    pub fn derive_key(secret: &str, salt: &str) -> Result<Key<Aes256Gcm>, String> {
        // In a real production app, use a random salt stored locally or provided by server.
        // Here we use the RoomID as salt (user input) for simplicity of stateless setup.
        // We ensure the result is checked to avoid uninitialized memory usage.
        let mut key_buffer = [0u8; 32]; // AES-256 needs 32 bytes

        let argon2 = Argon2::default();

        argon2
            .hash_password_into(secret.as_bytes(), salt.as_bytes(), &mut key_buffer)
            .map_err(|e| format!("Argon2 error: {}", e))?;

        Ok(*Key::<Aes256Gcm>::from_slice(&key_buffer))
    }

    pub fn encrypt(key: &Key<Aes256Gcm>, data: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
        let cipher = Aes256Gcm::new(key);
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, data)
            .map_err(|e| format!("Encryption failed: {}", e))?;

        Ok((ciphertext, nonce_bytes.to_vec()))
    }

    pub fn decrypt(
        key: &Key<Aes256Gcm>,
        ciphertext: &[u8],
        nonce: &[u8],
    ) -> Result<Vec<u8>, String> {
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(nonce);

        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))
    }
}
