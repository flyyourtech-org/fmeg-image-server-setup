# Image & Media Server API

A Node.js Express server for uploading, compressing, serving, listing, and downloading images, videos, audio, PDFs, and document files. Supports API key authentication and flexible media management.

---

## Features

- **Image upload** with JPEG compression (via [@imazen/imageflow](https://www.npmjs.com/package/@imazen/imageflow))
- **Video upload** with optional compression (via [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg))
- **Audio, PDF, and document file support**
- **Flexible file serving**: `/image/:filename`, `/video/:filename`, etc.
- **Media listing** with pagination, sorting, and filtering by type
- **Download endpoint** for any media type
- **API key authentication** for protected routes
- **Robust file lookup** (searches multiple directories for each type)
- **Automatic directory creation**
- **Excludes images with "client" in the filename from listings**

---

## Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd image-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create a `.env` file**

   ```
   PORT=3000
   API_KEYS=your-api-key
   BASE_URL=https://your-domain-or-ip:3000
   ```

   - `API_KEYS` can be a comma-separated list for multiple keys.

4. **Install FFmpeg**

   - **Linux:** `sudo apt install ffmpeg`
   - **macOS:** `brew install ffmpeg`
   - **Windows:** Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

   You can run `node install-ffmpeg.js` for guidance.

5. **Start the server**

   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

---

## API Usage

### Authentication

All routes except direct media access require an API key:

```http
Authorization: Bearer <your-api-key>
```

---

### Uploading Media

#### Upload Image

```http
POST /upload/image/:quality?
Content-Type: multipart/form-data

FormData:
- image: [file]
```

- `:quality` (optional): JPEG quality (1-100, default 80)
- Returns: `image/filename.jpg`

#### Upload Video

```http
POST /upload/video
Content-Type: multipart/form-data

FormData:
- video: [file]
```

- Returns: `video/compressed-filename.mp4`

#### Universal Media Upload

```http
POST /media/upload/:type
Content-Type: multipart/form-data

FormData:
- [any field name]: [file]
- fordownload: true (optional, returns download URL instead)
```

- `:type` = `image`, `video`, `audio`, `pdf`, or `doc`
- Returns: `{"url": "https://your-domain/type/filename.ext"}`
- With `fordownload=true`: `{"url": "https://your-domain/download/type/filename.ext"}`

---

### Accessing Media

#### Direct Access

```http
GET /image/:filename  (No authentication required)
GET /video/:filename  (No authentication required)
```

#### Download Media

```http
GET /download/:type/:filename
```

- `:type` = `image`, `video`, `audio`, `pdf`, or `doc`
- Downloads the file with proper Content-Disposition headers
- Requires API authentication

---

### Listing Media

#### All Media (Combined)

```http
GET /media?page=1&limit=10&sort=newest&type=image,video,audio,pdf,doc
```

- `type`: Can be a single type, comma-separated list, or `all`
- `sort`: `newest` (default), `oldest`, `name`, `size`, `type`
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- Returns paginated media list with metadata

#### Images Only

```http
GET /images?page=1&limit=10&sort=newest
```

#### Videos Only

```http
GET /videos?page=1&limit=10&sort=newest
```

---

### Deleting Media

```http
DELETE /delete/:type/:filename
```

- `:type` = `image` or `video`
- Returns success message and deleted path

---

## Example Usage

### Upload an Image

```javascript
const formData = new FormData();
formData.append("image", imageFile);

fetch("https://your-server/upload/image/90", {
  method: "POST",
  headers: {
    Authorization: "Bearer your-api-key",
  },
  body: formData,
})
  .then((response) => response.text())
  .then((path) => console.log("Image path:", path));
```

### Upload a Video

```javascript
const formData = new FormData();
formData.append("video", videoFile);

fetch("https://your-server/upload/video", {
  method: "POST",
  headers: {
    Authorization: "Bearer your-api-key",
  },
  body: formData,
})
  .then((response) => response.text())
  .then((path) => console.log("Video path:", path));
```

### Upload Any Media Type

```javascript
const formData = new FormData();
formData.append("file", pdfFile);
formData.append("fordownload", true); // Get a download URL instead

fetch("https://your-server/media/upload/pdf", {
  method: "POST",
  headers: {
    Authorization: "Bearer your-api-key",
  },
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log("PDF download URL:", data.url));
```


## Notes

- **Images with "client" in the filename are excluded from all listings.**
- The server will search multiple directories for each file type for both serving and downloading.
- All uploads are stored in the `uploads` directory (with subfolders for each type).
- Video compression requires FFmpeg with `libx264` encoder available.

---

## Troubleshooting

- Use `node install-ffmpeg.js` to diagnose FFmpeg issues.
- Ensure all upload directories exist and have correct permissions.
- Check your `.env` file for correct API keys and base URL.

---

## License

MIT
