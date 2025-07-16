import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { rtmpManager } from "./rtmp";
import { insertVideoSchema, insertStreamConfigSchema, insertStreamStatusSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import ffmpeg from "fluent-ffmpeg";

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

// Helper function to get video duration using FFmpeg
async function getVideoDuration(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error getting video duration:', err);
        resolve('00:00');
        return;
      }
      
      const duration = metadata.format.duration;
      if (!duration) {
        resolve('00:00');
        return;
      }
      
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      resolve(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    });
  });
}

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

      const { title } = req.body;
      const videos = await storage.getVideos();
      
      // Get video duration using FFmpeg
      const filePath = path.join(process.cwd(), 'uploads', req.file.filename);
      const duration = await getVideoDuration(filePath);
      
      const videoData = {
        title: title || req.file.originalname,
        filename: req.file.filename,
        fileSize: req.file.size,
        duration: duration,
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
      console.error('Error uploading video:', error);
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

      // Get platform-specific RTMP URL
      const getPlatformRTMPUrl = (platform: string, customUrl?: string): string => {
        switch (platform.toLowerCase()) {
          case 'youtube':
            return 'rtmp://a.rtmp.youtube.com/live2';
          case 'twitch':
            return 'rtmp://live.twitch.tv/app';
          case 'facebook':
            return 'rtmps://live-api-s.facebook.com:443/rtmp';
          case 'custom':
            return customUrl || 'rtmp://localhost:1935/live';
          default:
            return customUrl || 'rtmp://a.rtmp.youtube.com/live2';
        }
      };

      // Start RTMP stream
      const rtmpConfig = {
        inputPath: video.filename,
        outputUrl: getPlatformRTMPUrl(streamConfig.platform, streamConfig.rtmpUrl),
        streamKey: streamConfig.streamKey || 'default',
        quality: convertResolution(streamConfig.resolution || '1280x720'),
        bitrate: `${streamConfig.bitrate}k` || '3000k',
        fps: streamConfig.framerate || 30
      };

      const streamStarted = await rtmpManager.startStream(currentVideoId, rtmpConfig);
      
      if (!streamStarted) {
        return res.status(500).json({ message: "Failed to start RTMP stream" });
      }

      // Set loop enabled based on current status
      rtmpManager.setLoopEnabled(streamStatus?.loopPlaylist || false);

      const status = await storage.createOrUpdateStreamStatus({
        status: 'live',
        viewerCount: 0,
        uptime: '00:00:00',
        currentVideoId: currentVideoId,
        startedAt: new Date(),
        loopPlaylist: streamStatus?.loopPlaylist || false,
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

      // Disable loop when stopping stream
      rtmpManager.setLoopEnabled(false);

      const status = await storage.createOrUpdateStreamStatus({
        status: 'offline',
        viewerCount: 0,
        uptime: '00:00:00',
        currentVideoId: null,
        startedAt: null,
        loopPlaylist: false,
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
        loopPlaylist: false,
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
        loopPlaylist: currentStatus?.loopPlaylist || false,
      });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to set current video" });
    }
  });

  // Loop control endpoints
  app.post("/api/stream/loop/enable", async (req, res) => {
    try {
      const currentStatus = await storage.getStreamStatus();
      const status = await storage.createOrUpdateStreamStatus({
        status: currentStatus?.status || 'offline',
        viewerCount: currentStatus?.viewerCount || 0,
        uptime: currentStatus?.uptime || '00:00:00',
        currentVideoId: currentStatus?.currentVideoId || null,
        startedAt: currentStatus?.startedAt || null,
        loopPlaylist: true,
      });

      // Update RTMP manager if stream is active
      if (status.status === 'live') {
        rtmpManager.setLoopEnabled(true);
      }

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to enable playlist loop" });
    }
  });

  app.post("/api/stream/loop/disable", async (req, res) => {
    try {
      const currentStatus = await storage.getStreamStatus();
      const status = await storage.createOrUpdateStreamStatus({
        status: currentStatus?.status || 'offline',
        viewerCount: currentStatus?.viewerCount || 0,
        uptime: currentStatus?.uptime || '00:00:00',
        currentVideoId: currentStatus?.currentVideoId || null,
        startedAt: currentStatus?.startedAt || null,
        loopPlaylist: false,
      });

      // Update RTMP manager
      rtmpManager.setLoopEnabled(false);

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to disable playlist loop" });
    }
  });

  app.get("/api/stream/loop/status", async (req, res) => {
    try {
      const status = await storage.getStreamStatus();
      res.json({ 
        loopEnabled: status?.loopPlaylist || false,
        rtmpLoopEnabled: rtmpManager.isLoopEnabled()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get loop status" });
    }
  });

  app.post("/api/stream/test", (req, res) => {
    console.log("Stream test endpoint called");
    
    try {
      
      // Try different FFmpeg paths
      const ffmpegPaths = [
        'ffmpeg',
        '/nix/store/3zc5jbvqzrn8zmva4fx5p0nh4yy03wk4-ffmpeg-6.1.1-bin/bin/ffmpeg',
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg'
      ];
      
      let ffmpegFound = false;
      let ffmpegOutput = '';
      
      for (const ffmpegPath of ffmpegPaths) {
        try {
          const result = execSync(`${ffmpegPath} -version`, { 
            timeout: 5000, 
            encoding: 'utf8',
            stdio: 'pipe',
            env: { ...process.env, PATH: process.env.PATH }
          });
          
          if (result.includes('ffmpeg version')) {
            ffmpegFound = true;
            ffmpegOutput = result;
            console.log(`FFmpeg found at: ${ffmpegPath}`);
            break;
          }
        } catch (pathError) {
          console.log(`FFmpeg not found at ${ffmpegPath}:`, pathError.message);
          continue;
        }
      }
      
      if (ffmpegFound) {
        const versionMatch = ffmpegOutput.match(/ffmpeg version (\S+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        res.json({ 
          message: `Connection test successful - FFmpeg ${version} is available and working`,
          version: version
        });
      } else {
        res.status(400).json({ 
          message: "FFmpeg is not available in any of the expected locations",
          searchedPaths: ffmpegPaths
        });
      }
    } catch (error) {
      console.error("FFmpeg test error:", error);
      res.status(400).json({ 
        message: "FFmpeg test failed with error: " + error.message,
        error: error.toString()
      });
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
