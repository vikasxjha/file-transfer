const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const chokidar = require("chokidar");

class FileShareServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    this.sharedFolder = path.join(os.homedir(), "LocalFileShare");
    this.watcher = null;
    this.connectedClients = new Set();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.ensureSharedFolder();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, "../public")));

    // Setup multer for file uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.sharedFolder);
      },
      filename: (req, file, cb) => {
        // Handle duplicate filenames
        const originalName = file.originalname;
        const filePath = path.join(this.sharedFolder, originalName);

        if (fs.existsSync(filePath)) {
          const ext = path.extname(originalName);
          const name = path.basename(originalName, ext);
          let counter = 1;
          let newName;

          do {
            newName = `${name}_${counter}${ext}`;
            counter++;
          } while (fs.existsSync(path.join(this.sharedFolder, newName)));

          cb(null, newName);
        } else {
          cb(null, originalName);
        }
      },
    });

    this.upload = multer({
      storage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    });
  }

  setupRoutes() {
    // API Routes
    this.app.get("/api/files", (req, res) => {
      this.getFileList()
        .then((files) => res.json(files))
        .catch((err) => res.status(500).json({ error: err.message }));
    });

    this.app.post("/api/upload", this.upload.array("files"), (req, res) => {
      try {
        const uploadedFiles = req.files.map((file) => ({
          name: file.filename,
          size: file.size,
          path: file.path,
        }));

        // Notify all connected clients about new files
        this.io.emit("files-updated", { type: "upload", files: uploadedFiles });

        res.json({
          success: true,
          message: `${uploadedFiles.length} file(s) uploaded successfully`,
          files: uploadedFiles,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get("/api/download/:filename", (req, res) => {
      const filename = req.params.filename;
      const filePath = path.join(this.sharedFolder, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.download(filePath, filename);
    });

    this.app.delete("/api/files/:filename", (req, res) => {
      const filename = req.params.filename;
      const filePath = path.join(this.sharedFolder, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      fs.remove(filePath)
        .then(() => {
          this.io.emit("files-updated", { type: "delete", filename });
          res.json({ success: true, message: "File deleted successfully" });
        })
        .catch((err) => res.status(500).json({ error: err.message }));
    });

    this.app.get("/api/info", (req, res) => {
      res.json({
        sharedFolder: this.sharedFolder,
        connectedClients: this.connectedClients.size,
        serverTime: new Date().toISOString(),
      });
    });

    this.app.post("/api/set-folder", (req, res) => {
      const { folderPath } = req.body;

      if (!folderPath || !fs.existsSync(folderPath)) {
        return res.status(400).json({ error: "Invalid folder path" });
      }

      this.setSharedFolder(folderPath);
      res.json({ success: true, sharedFolder: this.sharedFolder });
    });

    // Serve the web UI
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../public/index.html"));
    });
  }

  setupSocketIO() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      this.connectedClients.add(socket.id);

      // Send current file list to new client
      this.getFileList()
        .then((files) => {
          socket.emit("files-list", files);
        })
        .catch(console.error);

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        this.connectedClients.delete(socket.id);
      });

      socket.on("request-files", () => {
        this.getFileList()
          .then((files) => {
            socket.emit("files-list", files);
          })
          .catch(console.error);
      });
    });
  }

  async ensureSharedFolder() {
    try {
      await fs.ensureDir(this.sharedFolder);
      this.setupFileWatcher();
    } catch (error) {
      console.error("Error creating shared folder:", error);
    }
  }

  setupFileWatcher() {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = chokidar.watch(this.sharedFolder, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
    });

    this.watcher
      .on("add", () => this.notifyFileChange("add"))
      .on("change", () => this.notifyFileChange("change"))
      .on("unlink", () => this.notifyFileChange("delete"));
  }

  async notifyFileChange(type) {
    try {
      const files = await this.getFileList();
      this.io.emit("files-updated", { type, files });
    } catch (error) {
      console.error("Error notifying file change:", error);
    }
  }

  async getFileList() {
    try {
      const files = await fs.readdir(this.sharedFolder);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.sharedFolder, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime,
            isDirectory: stats.isDirectory(),
          };
        })
      );
      return fileStats.filter((file) => !file.isDirectory);
    } catch (error) {
      console.error("Error reading file list:", error);
      return [];
    }
  }

  setSharedFolder(folderPath) {
    this.sharedFolder = folderPath;
    this.ensureSharedFolder();

    // Update multer destination
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.sharedFolder);
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      },
    });

    this.upload = multer({ storage });
  }

  getNetworkIP() {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName of Object.keys(networkInterfaces)) {
      for (const networkInterface of networkInterfaces[interfaceName]) {
        if (networkInterface.family === "IPv4" && !networkInterface.internal) {
          return networkInterface.address;
        }
      }
    }
    return "localhost";
  }

  start(port = 3001) {
    return new Promise((resolve, reject) => {
      this.server.listen(port, "0.0.0.0", (err) => {
        if (err) {
          reject(err);
        } else {
          const ip = this.getNetworkIP();
          const url = `http://${ip}:${port}`;
          console.log(`File sharing server running on ${url}`);
          resolve({
            server: this.server,
            url: url,
            port: port,
            sharedFolder: this.sharedFolder,
          });
        }
      });
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
}

function startServer(port) {
  const fileShareServer = new FileShareServer();
  return fileShareServer.start(port);
}

module.exports = { startServer, FileShareServer };
