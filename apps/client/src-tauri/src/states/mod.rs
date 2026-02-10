use std::sync::Mutex;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppStateError {
    #[error("secret not set")]
    SecretNotSet,
    #[error("lock acquisition failed")]
    LockFailed,
}

impl From<AppStateError> for String {
    fn from(err: AppStateError) -> Self {
        err.to_string()
    }
}

#[derive(Default)]
pub struct AppState {
    secret: Mutex<Option<String>>,
}

impl AppState {
    pub fn get_secret(&self) -> Result<String, AppStateError> {
        self.secret
            .lock()
            .map_err(|_| AppStateError::LockFailed)?
            .clone()
            .ok_or(AppStateError::SecretNotSet)
    }

    pub fn set_secret(&self, value: String) -> Result<(), AppStateError> {
        *self.secret.lock().map_err(|_| AppStateError::LockFailed)? = Some(value);

        Ok(())
    }

    pub fn clear_secret(&self) -> Result<(), AppStateError> {
        *self.secret.lock().map_err(|_| AppStateError::LockFailed)? = None;

        Ok(())
    }
}
