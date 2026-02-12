#!/bin/bash
echo "🐺 Wolf Mode: Restoring google-services.json from Base64 Secret..."
echo $GOOGLE_SERVICES_BASE64 | base64 --decode > google-services.json