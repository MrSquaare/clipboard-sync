#!/bin/bash

# Script to setup Debian environment to build Windows application using NSIS
sudo apt-get update && \
sudo apt-get install nsis lld llvm clang libayatana-appindicator3-dev --no-install-recommends -y && \
rustup target add x86_64-pc-windows-msvc && \
cargo install --locked cargo-xwin
