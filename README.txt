1. Extract this zip so you get a folder called s21-fix, and put that folder INSIDE your project folder
   (the folder that contains wrangler.toml), like:   ...\smart21store\smart21store\s21-fix
2. Open a terminal in the project folder and run:   s21-fix\fix-and-push.bat
It restores clean src\index.js and src\store-api.js, converts any UTF-16 files to UTF-8, then commits and pushes to GitHub.
