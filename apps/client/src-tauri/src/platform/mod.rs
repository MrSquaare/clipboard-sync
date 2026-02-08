pub fn get_device_name() -> String {
    whoami::devicename().unwrap_or_else(|_| whoami::hostname().unwrap_or_else(|_| "Unknown".into()))
}
