const express = require("express");
const multer = require("multer");
const { MozJPEG, Steps, FromBuffer, FromFile } = require("@imazen/imageflow");
const fs = require("fs");
const app = express();
require("dotenv").config();
const API_KEYS = [process.env.API_KEYS]; // Store your valid API keys here
const cors = require("cors");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path"); // Ensure path is required if not already

app.use(
  cors({
    origin: "*",
  })
);

console.log(API_KEYS);
// Multer configuration
const upload = multer({ storage: multer.memoryStorage() }); // Store image in memory

// Accept any field name for single file upload
const uploadAny = multer({ dest: "./uploads/tmp" }).any();

// Add this middleware to handle file uploads with buffer data
const handleBufferUploads = (req, res, next) => {
  // Check if there's a file buffer sent in the 'buffer' field
  if (req.body && req.body.buffer && typeof req.body.buffer === "string") {
    try {
      // If buffer is sent as base64 string, convert it to buffer
      const buffer = Buffer.from(req.body.buffer, "base64");

      // Create a file-like object that multer would typically create
      req.file = {
        buffer: buffer,
        originalname: req.body.filename || `unnamed-${Date.now()}`,
        mimetype: req.body.mimetype || "image/jpeg",
        size: buffer.length,
      };

      console.log(
        `Created file object from buffer with size: ${buffer.length} bytes`
      );
    } catch (error) {
      console.error("Error handling buffer upload:", error);
    }
  }
  next();
};

// Update the FFmpeg path configuration to store the path in a variable
try {
  // Define common locations where FFmpeg might be installed
  const possibleFfmpegPaths = [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
    "/opt/ffmpeg/bin/ffmpeg",
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "D:\\ffmpeg\\bin\\ffmpeg.exe", // Added Windows D: drive path
  ];

  let ffmpegFound = false;

  // Try setting ffmpeg path from potential locations
  for (const possiblePath of possibleFfmpegPaths) {
    if (fs.existsSync(possiblePath)) {
      console.log(`Found FFmpeg at: ${possiblePath}`);
      ffmpeg.setFfmpegPath(possiblePath);
      ffmpegPath = possiblePath; // Store the path in our variable
      ffmpegFound = true;
      break;
    }
  }

  if (!ffmpegFound) {
    console.log(
      "FFmpeg not found in common locations. Trying to find from PATH..."
    );
    // Try to get FFmpeg path from the system
    const which = require("which");
    try {
      const ffmpegPathFromSystem = which.sync("ffmpeg");
      console.log(`Found FFmpeg in PATH: ${ffmpegPathFromSystem}`);
      ffmpeg.setFfmpegPath(ffmpegPathFromSystem);
      ffmpegPath = ffmpegPathFromSystem; // Store the path in our variable
      ffmpegFound = true;
    } catch (whichErr) {
      console.warn("Could not find FFmpeg in PATH:", whichErr.message);
    }
  }

  // Log the configured FFmpeg path
  console.log("Current FFmpeg path:", ffmpegPath || "Not configured");
} catch (error) {
  console.warn("Could not set FFmpeg path:", error.message);
}

// Route to handle image upload and processing

app.get("/image/:filename", (req, res) => {
  const filename = req.params.filename;
  // Check multiple possible locations for image files
  const possiblePaths = [
    `./uploads/${filename}`, // Default location
    `./uploads/images/${filename}`, // Plural directory
    `./uploads/image/${filename}`, // Singular directory
  ];

  console.log(`Looking for image: ${filename}`);

  // Try each path until we find the file
  let fileFound = false;

  for (const imagePath of possiblePaths) {
    console.log(`Checking path: ${imagePath}`);

    if (fs.existsSync(imagePath)) {
      console.log(`Image found at: ${imagePath}`);
      fileFound = true;
      return res.sendFile(imagePath, { root: __dirname });
    }
  }

  // If we've tried all paths and found nothing
  if (!fileFound) {
    console.log(`Image not found: ${filename}`);
    return res.status(404).json({ error: "Image not found" });
  }
  const imagePath = `./uploads/${filename}`;

  fs.access(imagePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.sendFile(imagePath, { root: __dirname });
  });
});

// Update the video route to check multiple possible locations
app.get("/video/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);

  // Check multiple possible locations for video files
  const possiblePaths = [
    `./uploads/video/${filename}`, // Original path (singular directory)
    `./uploads/videos/${filename}`, // Plural directory
    `./uploads/${filename}`, // Root uploads directory
    `./uploads/compressed-${filename}`, // Compressed videos in root directory
  ];

  console.log(`Looking for video: ${filename}`);

  // Try each path until we find the file
  let fileFound = false;

  for (const videoPath of possiblePaths) {
    console.log(`Checking path: ${videoPath}`);

    if (fs.existsSync(videoPath)) {
      console.log(`Video found at: ${videoPath}`);
      fileFound = true;
      return res.sendFile(videoPath, { root: __dirname });
    }
  }

  // If we've tried all paths and found nothing
  if (!fileFound) {
    console.log(`Video not found: ${filename}`);
    return res.status(404).json({ error: "Video not found" });
  }
});

// Download media by type and filename
app.get("/download/:type/:filename", (req, res) => {
  const { type, filename } = req.params;
  const decodedFilename = decodeURIComponent(filename);

  // Determine possible paths based on type
  let possiblePaths = [];
  if (type === "image") {
    possiblePaths = [
      `./uploads/${decodedFilename}`,
      `./uploads/images/${decodedFilename}`,
      `./uploads/image/${decodedFilename}`,
    ];
  } else if (type === "video") {
    possiblePaths = [
      `./uploads/video/${decodedFilename}`,
      `./uploads/videos/${decodedFilename}`,
      `./uploads/${decodedFilename}`,
      `./uploads/compressed-${decodedFilename}`,
    ];
  } else if (type === "audio") {
    possiblePaths = [
      `./uploads/audio/${decodedFilename}`,
      `./uploads/audios/${decodedFilename}`,
      `./uploads/${decodedFilename}`,
    ];
  } else if (type === "pdf") {
    possiblePaths = [
      `./uploads/pdf/${decodedFilename}`,
      `./uploads/pdfs/${decodedFilename}`,
      `./uploads/${decodedFilename}`,
    ];
  } else if (type === "doc") {
    possiblePaths = [
      `./uploads/docs/${decodedFilename}`,
      `./uploads/documents/${decodedFilename}`,
      `./uploads/${decodedFilename}`,
    ];
  }else if(type === "documents" ||type === "document" ){
    {
      possiblePaths = [
        `./uploads/docs/${decodedFilename}`,
        `./uploads/documents/${decodedFilename}`,
        `./uploads/${decodedFilename}`,
      ];
    }
  }
   else {
    return res.status(400).json({ error: "Invalid media type" });
  }

  // Try each path until found
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return res.download(path.resolve(filePath), decodedFilename, (err) => {
        if (err) {
          console.error("Download error:", err);
          res.status(500).json({ error: "Failed to download file" });
        }
      });
    }
  }

  // Not found
  res.status(404).json({ error: "File not found" });
});

// Middleware to check API key
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header("Authorization")?.split(" ")[1]; // Extract key from Authorization header
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({ message: "Unauthorized: Invalid API Key" });
  }
  next(); // Continue to the requested route
};

app.use(authenticateApiKey); // Use this middleware for all routes

// Define directory variables consistently
const imageDir = "./uploads"; // Where images are storedstored
const videoDir = "./uploads/video"; // Where videos are stored

// Helper function for pagination if not already defined
const paginateResults = (items, page, limit) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};

  // Add pagination metadata
  if (endIndex < items.length) {
    results.next = {
      page: page + 1,
      limit: limit,
    };
  }

  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit: limit,
    };
  }

  results.total = items.length;
  results.pages = Math.ceil(items.length / limit);
  results.currentPage = page;
  results.results = items.slice(startIndex, endIndex);

  return results;
};

// Route to get all media (images, videos, audio, pdf, docs, etc) with pagination and type filtering
app.get("/media", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sort || "newest";
    // Support comma-separated types, e.g. type=image,video
    let filterType = req.query.type || "all";
    filterType = filterType.split(",").map((t) => t.trim().toLowerCase());

    // Define all possible directories to look for media
    const possibleImageDirectories = [
      "./uploads",
      "./uploads/images",
      "./uploads/image",
    ];
    const possibleVideoDirectories = [
      "./uploads/video",
      "./uploads/videos",
      "./uploads",
    ];
    const possibleAudioDirectories = [
      "./uploads/audio",
      "./uploads/audios",
      "./uploads",
    ];
    const possiblePdfDirectories = [
      "./uploads/pdf",
      "./uploads/pdfs",
      "./uploads",
    ];
    const possibleDocDirectories = [
      "./uploads/docs",
      "./uploads/documents",
      "./uploads",
    ];

    // Create all directories that don't exist
    [
      ...possibleImageDirectories,
      ...possibleVideoDirectories,
      ...possibleAudioDirectories,
      ...possiblePdfDirectories,
      ...possibleDocDirectories,
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Created directory: ${dir}`);
        } catch (err) {
          console.warn(`Could not create directory ${dir}:`, err.message);
        }
      }
    });

    // File type extension maps
    const typeMap = {
      image: [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".tiff",
        ".svg",
      ],
      video: [".mp4", ".avi", ".mov", ".webm", ".mkv", ".wmv", ".flv", ".mpeg"],
      audio: [".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".wma"],
      pdf: [".pdf"],
      doc: [
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".txt",
        ".rtf",
        ".odt",
      ],
    };

    // Helper to check if a file matches any of the requested types
    function matchesType(file, types) {
      const ext = path.extname(file).toLowerCase();
      if (types.includes("all")) return true;
      for (const t of types) {
        if (typeMap[t] && typeMap[t].includes(ext)) return true;
      }
      return false;
    }

    Promise.all([
      // Images
      Promise.all(
        possibleImageDirectories.map((dir) => {
          return new Promise((resolve) => {
            if (!fs.existsSync(dir)) return resolve([]);
            fs.readdir(dir, (err, files) => {
              if (err) return resolve([]);
              const imageFiles = files.filter(
                (file) =>
                  typeMap.image.includes(path.extname(file).toLowerCase()) &&
                  !file.toLowerCase().includes("client")
              );
              const imageDetails = imageFiles
                .map((file) => {
                  const filePath = path.join(dir, file);
                  let stats;
                  try {
                    stats = fs.statSync(filePath);
                  } catch {
                    return null;
                  }
                  return {
                    filename: file,
                    filepath: filePath,
                    url: `https://${req.get("host")}/image/${file}`,
                    created: stats.birthtime,
                    size: stats.size,
                    type: "image",
                  };
                })
                .filter(Boolean);
              resolve(imageDetails);
            });
          });
        })
      ),
      // Videos
      Promise.all(
        possibleVideoDirectories.map((dir) => {
          return new Promise((resolve) => {
            if (!fs.existsSync(dir)) return resolve([]);
            fs.readdir(dir, (err, files) => {
              if (err) return resolve([]);
              const videoFiles = files.filter((file) =>
                typeMap.video.includes(path.extname(file).toLowerCase())
              );
              const videoDetails = videoFiles
                .map((file) => {
                  const filePath = path.join(dir, file);
                  let stats;
                  try {
                    stats = fs.statSync(filePath);
                  } catch {
                    return null;
                  }
                  return {
                    filename: file,
                    filepath: filePath,
                    url: `https://${req.get("host")}/video/${file}`,
                    created: stats.birthtime,
                    size: stats.size,
                    type: "video",
                  };
                })
                .filter(Boolean);
              resolve(videoDetails);
            });
          });
        })
      ),
      // Audio
      Promise.all(
        possibleAudioDirectories.map((dir) => {
          return new Promise((resolve) => {
            if (!fs.existsSync(dir)) return resolve([]);
            fs.readdir(dir, (err, files) => {
              if (err) return resolve([]);
              const audioFiles = files.filter((file) =>
                typeMap.audio.includes(path.extname(file).toLowerCase())
              );
              const audioDetails = audioFiles
                .map((file) => {
                  const filePath = path.join(dir, file);
                  let stats;
                  try {
                    stats = fs.statSync(filePath);
                  } catch {
                    return null;
                  }
                  return {
                    filename: file,
                    filepath: filePath,
                    url: `https://${req.get("host")}/audio/${file}`,
                    created: stats.birthtime,
                    size: stats.size,
                    type: "audio",
                  };
                })
                .filter(Boolean);
              resolve(audioDetails);
            });
          });
        })
      ),
      // PDF
      Promise.all(
        possiblePdfDirectories.map((dir) => {
          return new Promise((resolve) => {
            if (!fs.existsSync(dir)) return resolve([]);
            fs.readdir(dir, (err, files) => {
              if (err) return resolve([]);
              const pdfFiles = files.filter((file) =>
                typeMap.pdf.includes(path.extname(file).toLowerCase())
              );
              const pdfDetails = pdfFiles
                .map((file) => {
                  const filePath = path.join(dir, file);
                  let stats;
                  try {
                    stats = fs.statSync(filePath);
                  } catch {
                    return null;
                  }
                  return {
                    filename: file,
                    filepath: filePath,
                    url: `https://${req.get("host")}/pdf/${file}`,
                    created: stats.birthtime,
                    size: stats.size,
                    type: "pdf",
                  };
                })
                .filter(Boolean);
              resolve(pdfDetails);
            });
          });
        })
      ),
      // Docs
      Promise.all(
        possibleDocDirectories.map((dir) => {
          return new Promise((resolve) => {
            if (!fs.existsSync(dir)) return resolve([]);
            fs.readdir(dir, (err, files) => {
              if (err) return resolve([]);
              const docFiles = files.filter((file) =>
                typeMap.doc.includes(path.extname(file).toLowerCase())
              );
              const docDetails = docFiles
                .map((file) => {
                  const filePath = path.join(dir, file);
                  let stats;
                  try {
                    stats = fs.statSync(filePath);
                  } catch {
                    return null;
                  }
                  return {
                    filename: file,
                    filepath: filePath,
                    url: `https://${req.get("host")}/doc/${file}`,
                    created: stats.birthtime,
                    size: stats.size,
                    type: "doc",
                  };
                })
                .filter(Boolean);
              resolve(docDetails);
            });
          });
        })
      ),
    ])
      .then((results) => {
        // Flatten and deduplicate by filename for each type
        const [imageArrays, videoArrays, audioArrays, pdfArrays, docArrays] =
          results;
        const flattenUnique = (arrays, type) => {
          const flat = arrays.flat();
          const seen = new Set();
          return flat.filter((item) => {
            if (!item) return false;
            if (seen.has(item.filename)) return false;
            seen.add(item.filename);
            return true;
          });
        };
        const uniqueImages = flattenUnique(imageArrays, "image");
        const uniqueVideos = flattenUnique(videoArrays, "video");
        const uniqueAudios = flattenUnique(audioArrays, "audio");
        const uniquePdfs = flattenUnique(pdfArrays, "pdf");
        const uniqueDocs = flattenUnique(docArrays, "doc");

        let allMedia = [];
        // Compose the result set based on filterType
        if (filterType.includes("all")) {
          allMedia = [
            ...uniqueImages,
            ...uniqueVideos,
            ...uniqueAudios,
            ...uniquePdfs,
            ...uniqueDocs,
          ];
        } else {
          if (filterType.includes("image")) allMedia.push(...uniqueImages);
          if (filterType.includes("video")) allMedia.push(...uniqueVideos);
          if (filterType.includes("audio")) allMedia.push(...uniqueAudios);
          if (filterType.includes("pdf")) allMedia.push(...uniquePdfs);
          if (filterType.includes("doc")) allMedia.push(...uniqueDocs);
        }

        // Sort the media based on the sort parameter
        if (sortBy === "oldest") {
          allMedia.sort((a, b) => a.created - b.created);
        } else if (sortBy === "name") {
          allMedia.sort((a, b) => a.filename.localeCompare(b.filename));
        } else if (sortBy === "size") {
          allMedia.sort((a, b) => b.size - a.size);
        } else if (sortBy === "type") {
          allMedia.sort((a, b) => a.type.localeCompare(b.type));
        } else {
          allMedia.sort((a, b) => b.created - a.created);
        }
        allMedia = allMedia.map(({ filepath, ...rest }) => rest);

        const paginatedResults = paginateResults(allMedia, page, limit);
        res.json(paginatedResults);
      })
      .catch((error) => {
        console.error("Error retrieving media files:", error);
        res.status(500).json({ error: "Failed to retrieve media files" });
      });
  } catch (error) {
    console.error("Error processing media list request:", error);
    res.status(500).json({ error: "Failed to retrieve media" });
  }
});

// Route to get all images with pagination
app.get("/images", authenticateApiKey, (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    // Get sort parameter
    const sortBy = req.query.sort || "newest";

    // Create images directory if it doesn't exist
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
      return res.json(paginateResults([], page, limit));
    }

    fs.readdir(imageDir, (err, files) => {
      if (err) {
        console.error("Error reading image directory:", err);
        return res.status(500).json({ error: "Failed to retrieve images" });
      }

      // Filter to include only image files and exclude client images
      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        // Make the client filter more robust - case insensitive search for "client"
        return (
          [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) &&
          !file.toLowerCase().includes("client")
        );
      });

      // Get file details including creation date
      const imageDetails = imageFiles.map((file) => {
        const filePath = path.join(imageDir, file);
        let stats;
        try {
          stats = fs.statSync(filePath);
        } catch (err) {
          console.error(`Error getting stats for ${filePath}:`, err);
          return {
            filename: file,
            url: `https://${req.get("host")}/image/${file}`,
            created: new Date(),
            size: 0,
            type: "image",
          };
        }

        return {
          filename: file,
          url: `https://${req.get("host")}/image/${file}`,
          created: stats.birthtime,
          size: stats.size,
          type: "image",
        };
      });

      // Sort the images based on the sort parameter
      if (sortBy === "oldest") {
        imageDetails.sort((a, b) => a.created - b.created);
      } else if (sortBy === "name") {
        imageDetails.sort((a, b) => a.filename.localeCompare(b.filename));
      } else if (sortBy === "size") {
        imageDetails.sort((a, b) => b.size - a.size);
      } else {
        // Default: newest
        imageDetails.sort((a, b) => b.created - a.created);
      }

      // Paginate the results
      const paginatedResults = paginateResults(imageDetails, page, limit);
      res.json(paginatedResults);
    });
  } catch (error) {
    console.error("Error processing image list request:", error);
    res.status(500).json({ error: "Failed to retrieve images" });
  }
});

// Route to get all videos with pagination
app.get("/videos", authenticateApiKey, (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    // Get sort parameter
    const sortBy = req.query.sort || "newest";

    // Create video directory if it doesn't exist
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
      return res.json(paginateResults([], page, limit));
    }

    fs.readdir(videoDir, (err, files) => {
      if (err) {
        console.error("Error reading video directory:", err);
        return res.status(500).json({ error: "Failed to retrieve videos" });
      }

      // Filter to include only video files
      const videoFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".mp4", ".avi", ".mov", ".webm", ".mkv"].includes(ext);
      });

      // Get file details including creation date
      const videoDetails = videoFiles.map((file) => {
        const filePath = path.join(videoDir, file);
        let stats;
        try {
          stats = fs.statSync(filePath);
        } catch (err) {
          console.error(`Error getting stats for ${filePath}:`, err);
          return {
            filename: file,
            url: `https://${req.get("host")}/video/${file}`,
            created: new Date(),
            size: 0,
            type: "video",
          };
        }

        return {
          filename: file,
          url: `https://${req.get("host")}/video/${file}`,
          created: stats.birthtime,
          size: stats.size,
          type: "video",
        };
      });

      // Sort the videos based on the sort parameter
      if (sortBy === "oldest") {
        videoDetails.sort((a, b) => a.created - b.created);
      } else if (sortBy === "name") {
        videoDetails.sort((a, b) => a.filename.localeCompare(b.filename));
      } else if (sortBy === "size") {
        videoDetails.sort((a, b) => b.size - a.size);
      } else {
        // Default: newest
        videoDetails.sort((a, b) => b.created - a.created);
      }

      // Paginate the results
      const paginatedResults = paginateResults(videoDetails, page, limit);
      res.json(paginatedResults);
    });
  } catch (error) {
    console.error("Error processing video list request:", error);
    res.status(500).json({ error: "Failed to retrieve videos" });
  }
});

app.post(
  "/upload/image/:quality?",
  upload.single("image"),
  handleBufferUploads,
  async (req, res) => {
    try {
      const { quality } = req.params;
      if (!req.file && (!req.body || !req.body.buffer)) {
        return res.status(400).json({ error: "No image provided" });
      }

      const qualityValue = parseInt(quality, 10) || 80; // Default to 80 if not provided
      if (qualityValue < 1 || qualityValue > 100) {
        return res
          .status(400)
          .json({ error: "Quality must be between 1 and 100" });
      }

      // Get the image buffer either from file upload or from request body
      const imageBuffer = req.file
        ? req.file.buffer
        : req.body.buffer
        ? Buffer.from(req.body.buffer, "base64")
        : null;

      if (!imageBuffer) {
        return res.status(400).json({ error: "Invalid image data" });
      }

      // Extract file info (from either source)
      const mimeType = req.file
        ? req.file.mimetype
        : req.body.mimetype || "image/jpeg";
      const originalName = req.file
        ? req.file.originalname
        : req.body.filename || `unnamed-${Date.now()}`;

      console.log(
        `Processing image: ${originalName}, mime type: ${mimeType}, buffer size: ${imageBuffer.length}`
      );

      // Normalize the file extension based on MIME type
      let fileExt;
      switch (mimeType) {
        case "image/jpeg":
        case "image/jpg":
          fileExt = ".jpg";
          break;
        case "image/png":
          fileExt = ".png";
          break;
        case "image/gif":
          fileExt = ".gif";
          break;
        case "image/webp":
          fileExt = ".webp";
          break;
        case "image/bmp":
          fileExt = ".bmp";
          break;
        default:
          // Default to jpg if MIME type not recognized
          fileExt = ".jpg";
      }

      // Create a clean filename with timestamp and proper extension
      const timestamp = Date.now();
      const cleanFileName = `${timestamp}${fileExt}`;

      // Store in the images directory
      const imageDir = "./uploads/images";
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const imagePath = `${imageDir}/${cleanFileName}`;
      const responseImage = `image/${cleanFileName}`;

      // Use imageflow to process the image
      let step = new Steps(new FromBuffer(imageBuffer)).branch((step) =>
        step.encode(new FromFile(imagePath), new MozJPEG(100))
      );

      const result = await step
        .encode(new FromBuffer(null, "key"), new MozJPEG(100))
        .execute();

      res.send(responseImage);
    } catch (error) {
      console.error("Error processing image:", error);
      res
        .status(500)
        .json({ error: "Failed to process image", details: error.message });
    }
  }
);

// Multer configuration for video
const videoUpload = multer({ storage: multer.memoryStorage() }); // Store video in memory

// Fix the upload-video route to maintain the original response format
app.post("/upload/video", videoUpload.single("video"), async (req, res) => {
  let responseHasBeenSent = false; // Flag to track if we've responded already

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video provided" });
    }

    // Get video buffer and metadata
    const videoBuffer = req.file.buffer;
    const videoName = `${
      req.file.originalname.split(".")[0]
    }-${Date.now()}.mp4`;

    // Always store videos in the same location for consistency
    const videoDir = "./uploads/video"; // Use singular form consistently
    const videoPath = `${videoDir}/${videoName}`;
    const compressedVideoPath = `${videoDir}/compressed-${videoName}`;
    const responseVideoPath = `${process.env.BASE_URL}/video/${videoName}`;

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync("./uploads")) {
      fs.mkdirSync("./uploads", { recursive: true });
    }

    // Create video directory if it doesn't exist
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    // Save the video buffer to a temporary file
    fs.writeFileSync(videoPath, videoBuffer);
    console.log(`Saved original video to: ${videoPath}`);

    // Use our stored path variable instead of the non-existent getter function
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      console.warn("FFmpeg not available or not found at path:", ffmpegPath);

      // Simple fallback - copy file and respond
      fs.copyFileSync(videoPath, compressedVideoPath);
      console.log(
        `FFmpeg not available - copied video without compression to: ${compressedVideoPath}`
      );

      responseHasBeenSent = true; // Mark that we're sending a response
      return res.send("video/" + `compressed-${videoName}`);
    }

    // FFmpeg is available, proceed with compression
    const ffmpegCommand = ffmpeg(videoPath)
      .outputOptions([
        "-c:v libx264", // Video codec
        "-crf 28", // Quality level
        "-preset medium", // Encoding speed/compression ratio
        "-c:a aac", // Audio codec
        "-b:a 128k", // Audio bitrate
        "-vf scale=iw*0.5:ih*0.5", // Scale to 50%
      ])
      .output(compressedVideoPath);

    // Add event handlers
    ffmpegCommand
      .on("start", (commandLine) => {
        console.log("FFmpeg started with command:", commandLine);
      })
      .on("progress", (progress) => {
        console.log(`FFmpeg Progress: ${JSON.stringify(progress)}`);
      })
      .on("end", () => {
        // Only respond if we haven't already
        if (responseHasBeenSent) return;

        console.log("Video compression complete");

        // Optional: Remove the original video after compression
        try {
          fs.unlinkSync(videoPath);
          console.log("Original video removed after compression");
        } catch (err) {
          console.warn("Could not remove original video:", err.message);
        }

        // Send response with the same format as original code
        responseHasBeenSent = true;
        res.send("video/" + `compressed-${videoName}`);
      })
      .on("error", (err) => {
        // Only respond if we haven't already
        if (responseHasBeenSent) return;

        console.error("Error compressing video:", err);

        // Attempt to use the original video as fallback
        try {
          fs.copyFileSync(videoPath, compressedVideoPath);
          console.log(`Compression failed - copied original video as fallback`);

          responseHasBeenSent = true;
          res.send({
            url: responseVideoPath.replace(
              videoName,
              `compressed-${videoName}`
            ),
          });
        } catch (copyErr) {
          if (!responseHasBeenSent) {
            responseHasBeenSent = true;
            res.status(500).json({
              error: "Failed to compress video",
              details: err.message,
            });
          }
        }
      });

    // Run the FFmpeg command directly
    try {
      ffmpegCommand.run();
    } catch (runError) {
      // Only respond if we haven't already
      if (responseHasBeenSent) return;

      console.error("Error executing FFmpeg command:", runError);

      // Fallback if FFmpeg fails to run
      fs.copyFileSync(videoPath, compressedVideoPath);
      console.log(`FFmpeg run failed - copied original video as fallback`);

      responseHasBeenSent = true;
      res.send("video/" + `compressed-${videoName}`);
    }
  } catch (error) {
    // Only respond if we haven't already
    if (responseHasBeenSent) return;

    console.error("Error uploading video:", error);
    res.status(500).json({ error: "Failed to process video" });
  }
});

// Improved DELETE route with better path checking
app.delete("/delete/:type/:filename", (req, res) => {
  try {
    const { type, filename } = req.params;

    // Validate type parameter
    if (type !== "image" && type !== "video") {
      return res
        .status(400)
        .json({ error: "Invalid media type. Type must be 'image' or 'video'" });
    }

    // Decode the filename to handle URL-encoded characters
    const decodedFilename = decodeURIComponent(filename);
    console.log(`Attempting to delete ${type}: ${decodedFilename}`);

    // Initialize array of paths to check based on file type
    let possiblePaths = [];

    if (type === "image") {
      // Check all possible image paths
      possiblePaths = [
        `./uploads/${decodedFilename}`,
        `./uploads/images/${decodedFilename}`,
        `./uploads/image/${decodedFilename}`,
      ];
    } else {
      // Check all possible video paths
      possiblePaths = [
        // Check compressed versions
        `./uploads/video/compressed-${decodedFilename}`,
        `./uploads/videos/compressed-${decodedFilename}`,
        `./uploads/compressed-${decodedFilename}`,
        // Check original versions
        `./uploads/video/${decodedFilename}`,
        `./uploads/videos/${decodedFilename}`,
        `./uploads/${decodedFilename}`,
      ];

      // If filename already starts with "compressed-", also check without prefix
      if (decodedFilename.startsWith("compressed-")) {
        const originalFilename = decodedFilename.substring(11); // Remove "compressed-" prefix
        possiblePaths.push(
          `./uploads/video/${originalFilename}`,
          `./uploads/videos/${originalFilename}`,
          `./uploads/${originalFilename}`
        );
      }
    }

    console.log(
      `Checking ${possiblePaths.length} possible locations for ${type}`
    );

    // Check each path and delete the first file found
    let fileFound = false;

    // Function to check next path or return not found
    const checkNextPath = (index) => {
      if (index >= possiblePaths.length) {
        // We've checked all paths and found nothing
        console.log(`${type} not found in any of the expected locations`);
        return res.status(404).json({
          error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
        });
      }

      const currentPath = possiblePaths[index];
      console.log(`Checking path: ${currentPath}`);

      fs.access(currentPath, fs.constants.F_OK, (err) => {
        if (err) {
          // File not found at this path, try next one
          return checkNextPath(index + 1);
        }

        // File found, delete it
        console.log(`Found ${type} at: ${currentPath}, deleting...`);
        fs.unlink(currentPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(`Error deleting ${type}:`, unlinkErr);
            return res.status(500).json({ error: `Failed to delete ${type}` });
          }

          console.log(`Successfully deleted ${type}: ${currentPath}`);
          res.json({
            message: `${
              type.charAt(0).toUpperCase() + type.slice(1)
            } deleted successfully`,
            path: currentPath,
          });

          // For videos, try to also delete any related files
          if (type === "video" && decodedFilename.startsWith("compressed-")) {
            const originalFilename = decodedFilename.substring(11); // Remove "compressed-" prefix

            // Try to delete the original file if it exists
            [
              `./uploads/video/${originalFilename}`,
              `./uploads/videos/${originalFilename}`,
              `./uploads/${originalFilename}`,
            ].forEach((origPath) => {
              if (fs.existsSync(origPath)) {
                try {
                  fs.unlinkSync(origPath);
                  console.log(`Also deleted related file: ${origPath}`);
                } catch (cleanupErr) {
                  console.warn(
                    `Could not delete related file ${origPath}:`,
                    cleanupErr.message
                  );
                }
              }
            });
          }
        });
      });
    };

    // Start checking paths from index 0
    checkNextPath(0);
  } catch (error) {
    console.error("Error processing delete request:", error);
    res.status(500).json({ error: "Server error" });
  }
});



// Fix the POST /media/upload/:type endpoint to handle file extensions properly
app.post("/media/upload/:type", uploadAny, handleBufferUploads, (req, res) => {
  try {
    const { type } = req.params;
    // Accept any field name, get the first file
    const file = req.files && req.files[0];

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (!file.path) {
      return res.status(400).json({ message: "File path missing" });
    }

    // Determine destination directory based on type
    let destDir = "./uploads";
    if (type === "image") destDir = "./uploads/images";
    else if (type === "video") destDir = "./uploads/videos";
    else if (type === "audio") destDir = "./uploads/audios";
    else if (type === "pdf") destDir = "./uploads/pdfs";
    else if (type === "doc") destDir = "./uploads/docs";

    // Ensure directory exists
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Process and normalize file extension
    const originalName = file.originalname || path.basename(file.path);
    let originalExt = path.extname(originalName).toLowerCase();
    const mimeType = file.mimetype || "";

    // Determine the correct extension based on file type and MIME type
    let finalExt;
    if (type === "image") {
      const validImageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];

      // Set extension based on mime type
      if (mimeType.startsWith("image/")) {
        switch (mimeType) {
          case "image/jpeg":
            finalExt = ".jpg";
            break;
          case "image/png":
            finalExt = ".png";
            break;
          case "image/gif":
            finalExt = ".gif";
            break;
          case "image/webp":
            finalExt = ".webp";
            break;
          case "image/bmp":
            finalExt = ".bmp";
            break;
          default:
            finalExt = ".jpg"; // Default for images
        }
      } else if (validImageExts.includes(originalExt)) {
        finalExt = originalExt;
      } else {
        finalExt = ".jpg"; // Default for images
      }
    } else {
      // For other types, use original extension or default based on type
      finalExt =
        originalExt ||
        (type === "video"
          ? ".mp4"
          : type === "audio"
          ? ".mp3"
          : type === "pdf"
          ? ".pdf"
          : ".bin");
    }

    // Create a clean filename with timestamp
    const baseName = path.basename(originalName, originalExt);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const filename = `${timestamp}-${safeBaseName}${finalExt}`;
    const destPath = path.join(destDir, filename);

    console.log(`Moving uploaded ${type} from ${file.path} to ${destPath}`);

    // Move file to destination
    fs.renameSync(file.path, destPath);

    // Return appropriate URL
    if (req.body.fordownload) {
      const downloadUrl = `https://${req.get(
        "host"
      )}/download/${type}/${filename}`;
      return res.json({ url: downloadUrl });
    } else {
      const url = `https://${req.get("host")}/${type}/${filename}`;
      res.json({ url });
    }
  } catch (error) {
    console.error("Media upload error:", error);
    res.status(500).json({ message: "Failed to upload media" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
