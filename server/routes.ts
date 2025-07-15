import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema, insertStreamConfigSchema, insertStreamStatusSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, AVI, and MOV files are allowed.'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Video routes
  app.get("/api/videos", async (req, res) => {
    try {
      const videos = await storage.getVideos();
      res.json(videos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.post("/api/videos", upload.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      const { title, duration } = req.body;
      const videos = await storage.getVideos();
      
      const videoData = {
        title: title || req.file.originalname,
        filename: req.file.filename,
        fileSize: req.file.size,
        duration: duration || "00:00",
        thumbnailUrl: null,
        playlistOrder: videos.length,
      };

      const result = insertVideoSchema.safeParse(videoData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid video data", errors: result.error.errors });
      }

      const video = await storage.createVideo(result.data);
      res.status(201).json(video);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  app.put("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertVideoSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid video data", errors: result.error.errors });
      }

      const video = await storage.updateVideo(id, result.data);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      res.json(video);
    } catch (error) {
      res.status(500).json({ message: "Failed to update video" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteVideo(id);
      
      if (!success) {
        return res.status(404).json({ message: "Video not found" });
      }

      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  app.post("/api/videos/reorder", async (req, res) => {
    try {
      const { videoIds } = req.body;
      
      if (!Array.isArray(videoIds)) {
        return res.status(400).json({ message: "videoIds must be an array" });
      }

      await storage.reorderPlaylist(videoIds);
      res.json({ message: "Playlist reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder playlist" });
    }
  });

  // Stream configuration routes
  app.get("/api/stream-config", async (req, res) => {
    try {
      const config = await storage.getStreamConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stream configuration" });
    }
  });

  app.post("/api/stream-config", async (req, res) => {
    try {
      const result = insertStreamConfigSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid stream configuration", errors: result.error.errors });
      }

      const config = await storage.createOrUpdateStreamConfig(result.data);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to save stream configuration" });
    }
  });

  // Stream status routes
  app.get("/api/stream-status", async (req, res) => {
    try {
      const status = await storage.getStreamStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stream status" });
    }
  });

  app.post("/api/stream/start", async (req, res) => {
    try {
      const videos = await storage.getVideos();
      if (videos.length === 0) {
        return res.status(400).json({ message: "No videos in playlist" });
      }

      const status = await storage.createOrUpdateStreamStatus({
        status: 'live',
        viewerCount: Math.floor(Math.random() * 2000) + 100, // Mock viewer count
        uptime: '00:00:00',
        currentVideoId: videos[0].id,
        startedAt: new Date(),
      });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to start stream" });
    }
  });

  app.post("/api/stream/stop", async (req, res) => {
    try {
      const status = await storage.createOrUpdateStreamStatus({
        status: 'offline',
        viewerCount: 0,
        uptime: '00:00:00',
        currentVideoId: null,
        startedAt: null,
      });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to stop stream" });
    }
  });

  app.post("/api/stream/pause", async (req, res) => {
    try {
      const currentStatus = await storage.getStreamStatus();
      if (!currentStatus || currentStatus.status !== 'live') {
        return res.status(400).json({ message: "Stream is not currently live" });
      }

      const status = await storage.createOrUpdateStreamStatus({
        status: 'paused',
        viewerCount: currentStatus.viewerCount,
        uptime: currentStatus.uptime,
        currentVideoId: currentStatus.currentVideoId,
        startedAt: currentStatus.startedAt,
      });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to pause stream" });
    }
  });

  app.post("/api/stream/restart", async (req, res) => {
    try {
      const videos = await storage.getVideos();
      if (videos.length === 0) {
        return res.status(400).json({ message: "No videos in playlist" });
      }

      const status = await storage.createOrUpdateStreamStatus({
        status: 'live',
        viewerCount: Math.floor(Math.random() * 2000) + 100,
        uptime: '00:00:00',
        currentVideoId: videos[0].id,
        startedAt: new Date(),
      });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to restart stream" });
    }
  });

  app.post("/api/stream/test", async (req, res) => {
    try {
      // Mock connection test - simulate success/failure
      const success = Math.random() > 0.3; // 70% success rate
      
      if (success) {
        res.json({ message: "Connection test successful" });
      } else {
        res.status(400).json({ message: "Connection failed. Please check your settings." });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to test connection" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
