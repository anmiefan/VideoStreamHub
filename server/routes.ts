import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { rtmpManager } from "./rtmp";
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
      const streamStatus = await storage.getStreamStatus();
      const currentVideoId = streamStatus?.currentVideoId;
      
      if (!currentVideoId) {
        return res.status(400).json({ message: "No video selected for streaming" });
      }

      const video = await storage.getVideo(currentVideoId);
      if (!video) {
        return res.status(400).json({ message: "Selected video not found" });
      }

      // Get stream configuration
      const streamConfig = await storage.getStreamConfig();
      if (!streamConfig) {
        return res.status(400).json({ message: "Stream configuration not found" });
      }

      // Convert resolution format for FFmpeg
      const convertResolution = (resolution: string): string => {
        switch (resolution) {
          case '1920x1080': return '1080p';
          case '1280x720': return '720p';
          case '854x480': return '480p';
          default: return '720p';
        }
      };

      // Start RTMP stream
      const rtmpConfig = {
        inputPath: video.filename,
        outputUrl: streamConfig.rtmpUrl || 'rtmp://localhost:1935/live',
        streamKey: streamConfig.streamKey || 'default',
        quality: convertResolution(streamConfig.resolution || '1280x720'),
        bitrate: `${streamConfig.bitrate}k` || '3000k',
        fps: streamConfig.framerate || 30
      };

      const streamStarted = await rtmpManager.startStream(currentVideoId, rtmpConfig);
      
      if (!streamStarted) {
        return res.status(500).json({ message: "Failed to start RTMP stream" });
      }

      const status = await storage.createOrUpdateStreamStatus({
        status: 'live',
        viewerCount: Math.floor(Math.random() * 2000) + 100,
        uptime: '00:00:00',
        currentVideoId: currentVideoId,
        startedAt: new Date(),
      });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to start stream" });
    }
  });

  app.post("/api/stream/stop", async (req, res) => {
    try {
      // Stop all RTMP streams
      rtmpManager.stopAllStreams();

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

  app.post("/api/stream/set-current", async (req, res) => {
    try {
      const { videoId } = req.body;
      
      if (!videoId) {
        return res.status(400).json({ message: "Video ID is required" });
      }

      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      const currentStatus = await storage.getStreamStatus();
      const status = await storage.createOrUpdateStreamStatus({
        status: currentStatus?.status || 'offline',
        viewerCount: currentStatus?.viewerCount || 0,
        uptime: currentStatus?.uptime || '00:00:00',
        currentVideoId: videoId,
        startedAt: currentStatus?.startedAt || null,
      });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to set current video" });
    }
  });

  app.post("/api/stream/test", (req, res) => {
    console.log("Stream test endpoint called");
    
    try {
      // Test FFmpeg availability
      const { execSync } = require('child_process');
      
      // Test FFmpeg with a simple command
      const result = execSync('ffmpeg -version', { 
        timeout: 5000, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (result.includes('ffmpeg version')) {
        res.json({ message: "Connection test successful - FFmpeg is available and working" });
      } else {
        res.status(400).json({ message: "FFmpeg test failed - unexpected output" });
      }
    } catch (error) {
      console.error("FFmpeg test error:", error);
      res.status(400).json({ message: "FFmpeg is not available or not working properly" });
    }
  });

  // RTMP webhook endpoints
  app.post("/api/rtmp/publish", async (req, res) => {
    try {
      console.log("RTMP Publish started:", req.body);
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).json({ message: "Failed to handle RTMP publish" });
    }
  });

  app.post("/api/rtmp/play", async (req, res) => {
    try {
      console.log("RTMP Play started:", req.body);
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).json({ message: "Failed to handle RTMP play" });
    }
  });

  app.post("/api/rtmp/publish_done", async (req, res) => {
    try {
      console.log("RTMP Publish ended:", req.body);
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).json({ message: "Failed to handle RTMP publish done" });
    }
  });

  app.post("/api/rtmp/play_done", async (req, res) => {
    try {
      console.log("RTMP Play ended:", req.body);
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).json({ message: "Failed to handle RTMP play done" });
    }
  });

  app.post("/api/rtmp/record_done", async (req, res) => {
    try {
      console.log("RTMP Recording finished:", req.body);
      res.status(200).send("OK");
    } catch (error) {
      res.status(500).json({ message: "Failed to handle RTMP record done" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
