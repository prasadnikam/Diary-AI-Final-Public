#!/bin/bash

# Setup script for Gemini API Key
echo "=== Gemini API Key Setup ==="
echo ""
echo "Please enter your Gemini API Key from https://aistudio.google.com/app/apikey"
read -p "API Key: " api_key

# Add to .zshrc if not already present
if grep -q "GEMINI_API_KEY" ~/.zshrc; then
    echo "GEMINI_API_KEY already exists in .zshrc"
    echo "Updating the value..."
    sed -i.bak "s/export GEMINI_API_KEY=.*/export GEMINI_API_KEY=\"$api_key\"/" ~/.zshrc
else
    echo "Adding GEMINI_API_KEY to .zshrc..."
    echo "" >> ~/.zshrc
    echo "# Gemini API Key for AI Diary" >> ~/.zshrc
    echo "export GEMINI_API_KEY=\"$api_key\"" >> ~/.zshrc
fi

# Apply changes
source ~/.zshrc

echo ""
echo "✓ API Key has been set!"
echo "✓ Please restart your Django server for changes to take effect"
echo ""
echo "To verify, run: echo \$GEMINI_API_KEY"
