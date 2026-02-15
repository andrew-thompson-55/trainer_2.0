# 1. Navigate to mobile app directory                                                                                                                                                                                    
  cd chimera_mobile_app
                                                                                                                                                                                                                             # 2. Update version in app.json (current: 1.2.0 → new: 1.2.1)                                                                                                                                                            
  # Edit manually or use this command:
  # On Windows PowerShell:
  (Get-Content app.json) -replace '"version": "1.2.0"', '"version": "1.2.1"' | Set-Content app.json

  # 3. Build APK for production testing
  npx eas build -p android --profile preview

  What happens next:
  - EAS will upload your code and build the APK in the cloud
  - You'll get a link to download the APK when it's done (usually 5-10 minutes)
  - Install the APK on your phone to test the new version

  Version numbering guide:
  - Patch (bug fixes): 1.2.0 → 1.2.1
  - Minor (new features): 1.2.0 → 1.3.0
  - Major (breaking changes): 1.2.0 → 2.0.0