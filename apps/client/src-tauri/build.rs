fn main() {
    println!("cargo:rerun-if-env-changed=LOG_LEVEL");
    println!("cargo:rerun-if-env-changed=ENV");

    if std::env::var("LOG_LEVEL").is_err() {
        let env = std::env::var("ENV").unwrap_or_else(|_| "".to_string());
        let log_level = match env.as_str() {
            "production" => "error",
            "preview" => "info",
            "dev" => "debug",
            _ => "debug",
        };

        println!("cargo:rustc-env=LOG_LEVEL={}", log_level);
    }

    tauri_build::build()
}
