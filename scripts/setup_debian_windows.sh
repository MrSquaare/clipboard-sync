#!/bin/bash

# Script to setup Debian environment to build Windows application using NSIS
sudo apt update && \
sudo apt install nsis lld llvm clang -y && \
rustup target add x86_64-pc-windows-msvc && \
cargo install --locked cargo-xwin
