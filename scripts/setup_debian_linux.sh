#!/bin/bash

# Script to setup Debian environment to build for Linux
sudo apt-get update && \
sudo apt-get install lld llvm clang libglib2.0-dev libgtk-3-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev --no-install-recommends -y
