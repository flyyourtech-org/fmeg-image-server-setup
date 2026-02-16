/**
 * This utility script checks if FFmpeg is properly installed and configured.
 * Run this script with Node.js to diagnose FFmpeg-related issues.
 */
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');

// Check if ffmpeg is accessible via PATH
console.log('Checking FFmpeg installation...');

// Try to get FFmpeg version using fluent-ffmpeg
ffmpeg.getAvailableFormats((err, formats) => {
  if (err) {
    console.error('Error accessing FFmpeg via fluent-ffmpeg:', err);
    console.log('\nTrying to directly access FFmpeg from command line...');
    
    // Try direct command access
    const ffmpegProcess = spawn('ffmpeg', ['-version']);
    
    ffmpegProcess.stdout.on('data', (data) => {
      console.log('\nFFmpeg is installed! Version information:');
      console.log(data.toString());
    });
    
    ffmpegProcess.stderr.on('data', (data) => {
      console.error('\nFFmpeg error output:', data.toString());
    });
    
    ffmpegProcess.on('error', (err) => {
      console.error('\nFailed to start FFmpeg process. Error:', err);
      console.log('\n====== TROUBLESHOOTING GUIDE ======');
      console.log('1. Make sure FFmpeg is installed on your system.');
      console.log('   - On Windows: Download from https://ffmpeg.org/download.html');
      console.log('   - On macOS: Install via Homebrew with "brew install ffmpeg"');
      console.log('   - On Linux: Install via package manager, e.g., "apt install ffmpeg"');
      console.log('2. Add FFmpeg to your PATH environment variable.');
      console.log('3. Restart your server/terminal after installation.');
      console.log('4. Make sure you have appropriate permissions.');
      console.log('\nFor additional help, visit: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#prerequisites');
    });
    
    ffmpegProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(`\nFFmpeg process exited with code ${code}`);
      }
    });
  } else {
    console.log('\nFFmpeg is working correctly via fluent-ffmpeg!');
    console.log(`Available formats: ${Object.keys(formats).length}`);
    
    // Check available encoders
    ffmpeg.getAvailableEncoders((err, encoders) => {
      if (err) {
        console.error('Error getting encoders:', err);
      } else {
        // Check if we have libx264 (required for our compression)
        if (encoders['libx264']) {
          console.log('\nH.264 encoder (libx264) is available ✅');
        } else {
          console.log('\nWARNING: H.264 encoder (libx264) not found! This may cause compression issues.');
          console.log('Available video encoders:');
          Object.keys(encoders).forEach(encoder => {
            if (encoders[encoder].type === 'video') {
              console.log(` - ${encoder}`);
            }
          });
        }
      }
    });
  }
});

// Provide a simple test function
console.log('\nTo test video compression with a sample file, run:');
console.log('const { testCompression } = require("./ffmpeg-check");');
console.log('testCompression("path/to/video.mp4", "output.mp4");');

// Test function that can be called to verify compression works
function testCompression(inputPath, outputPath) {
  console.log(`Testing compression from ${inputPath} to ${outputPath}...`);
  
  ffmpeg(inputPath)
    .outputOptions([
      '-c:v libx264',
      '-crf 28',
      '-preset medium',
      '-c:a aac',
      '-b:a 128k',
      '-vf scale=iw*0.5:ih*0.5'
    ])
    .output(outputPath)
    .on('start', (commandLine) => {
      console.log('FFmpeg started with command:', commandLine);
    })
    .on('progress', (progress) => {
      console.log(`Processing: ${JSON.stringify(progress)}`);
    })
    .on('end', () => {
      console.log('Test compression completed successfully! ✅');
    })
    .on('error', (err, stdout, stderr) => {
      console.error('Test compression failed:', err);
      console.error('stdout:', stdout);
      console.error('stderr:', stderr);
    })
    .run();
}

module.exports = { testCompression };
