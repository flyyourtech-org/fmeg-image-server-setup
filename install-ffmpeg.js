/**
 * Script to check for FFmpeg installation and provide guidance for installation
 */
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

console.log("FFmpeg Installation Helper");
console.log("=========================\n");

// Detect operating system
const platform = os.platform();
console.log(`Detected platform: ${platform}`);

// Check if FFmpeg is already installed
function checkFfmpeg() {
  try {
    const command = platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    const result = execSync(command).toString().trim();
    console.log(`✅ FFmpeg found at: ${result}`);
    return true;
  } catch (error) {
    console.log("❌ FFmpeg not found in PATH");
    return false;
  }
}

// Provide installation instructions based on platform
function provideInstructions() {
  console.log("\nInstallation instructions:");

  switch (platform) {
    case "linux":
      console.log(`
Linux Installation (Ubuntu/Debian):
-----------------------------------
1. Update package lists:
   sudo apt update

2. Install FFmpeg:
   sudo apt install -y ffmpeg

3. Verify installation:
   ffmpeg -version
      `);
      break;

    case "darwin": // macOS
      console.log(`
macOS Installation:
------------------
1. Install Homebrew if not already installed:
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

2. Install FFmpeg:
   brew install ffmpeg

3. Verify installation:
   ffmpeg -version
      `);
      break;

    case "win32": // Windows
      console.log(`
Windows Installation:
-------------------
1. Download FFmpeg from https://ffmpeg.org/download.html
   (Windows builds by BtbN: https://github.com/BtbN/FFmpeg-Builds/releases)

2. Extract the zip file to a location like C:\\ffmpeg

3. Add the bin folder to your PATH:
   - Right-click on 'This PC' or 'My Computer' and select 'Properties'
   - Click on 'Advanced system settings'
   - Click on 'Environment Variables'
   - Under 'System Variables', find 'Path', select it and click 'Edit'
   - Click 'New' and add the path to the bin folder (e.g., C:\\ffmpeg\\bin)
   - Click 'OK' on all dialogs

4. Restart your terminal/command prompt and verify:
   ffmpeg -version
      `);
      break;

    default:
      console.log(`
Please visit the official FFmpeg website for installation instructions:
https://ffmpeg.org/download.html
      `);
  }

  // Additional instruction for PM2 users
  console.log(`
Special Note for PM2 Users:
--------------------------
If you're running your application with PM2, you might need to:
1. Install FFmpeg system-wide as shown above
2. Ensure the PATH environment is properly set in PM2:

   # For Linux/macOS systems
   pm2 restart image-server --update-env

   # Or specify the path explicitly in your code using:
   ffmpeg.setFfmpegPath('/usr/bin/ffmpeg'); // Adjust path as needed
  `);
}

// Attempt to check FFmpeg version if installed
function checkVersion() {
  try {
    const ffmpegProcess = spawn("ffmpeg", ["-version"]);

    ffmpegProcess.stdout.on("data", (data) => {
      console.log("\nFFmpeg version information:");
      console.log("---------------------------");

      // Extract and display just the first line that contains the version
      const versionInfo = data.toString().split("\n")[0];
      console.log(versionInfo);

      console.log("\nFFmpeg is correctly installed! ✅");
    });

    ffmpegProcess.stderr.on("data", (data) => {
      console.error("\nFFmpeg error output:", data.toString());
    });

    ffmpegProcess.on("error", () => {
      console.log("\nCould not execute FFmpeg.");
      provideInstructions();
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        console.log(`\nFFmpeg process exited with code ${code}`);
        provideInstructions();
      }
    });
  } catch (error) {
    console.error("Error checking FFmpeg version:", error);
    provideInstructions();
  }
}

// Run checks
if (!checkFfmpeg()) {
  provideInstructions();
} else {
  checkVersion();
}

console.log(`
Additional Troubleshooting:
-------------------------
1. Make sure FFmpeg is accessible from the user account running your Node.js application
2. For cloud environments or containers, ensure FFmpeg is installed in the runtime environment
3. If using a cloud service like Heroku, you might need to add buildpacks:
   heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
`);
