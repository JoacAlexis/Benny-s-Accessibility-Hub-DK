#!/bin/bash

echo "Starting Benny's Hub - Electron"

# Move to script directory
cd "$(dirname "$0")"

# Wait 5 seconds (like timeout /t 5)
sleep 5

# Start Electron app
npm start

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to start the application."
    echo "Please ensure Node.js is installed and 'npm install' has been run."
    read -p "Press Enter to continue..."
fi
