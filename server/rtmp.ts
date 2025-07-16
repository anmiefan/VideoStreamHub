import { spawn, ChildProcess } from 'child_process';
import { storage } from './storage';
import { log } from './vite';

export interface RTMPConfig {
  inputPath: string;
  outputUrl: string;
  streamKey: string;
  quality: string;
  bitrate: string;
  fps: number;
}

export class RTMPStreamManager {
  private activeStreams: Map<string, ChildProcess> = new Map();
  private streamConfigs: Map<string, RTMPConfig> = new Map();
  private loopEnabled: boolean = false;

  async startStream(videoId: number, config: RTMPConfig): Promise<boolean> {
    try {
      const video = await storage.getVideo(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      const streamKey = `video_${videoId}`;
      
      // Stop existing stream if running
      if (this.activeStreams.has(streamKey)) {
        this.stopStream(streamKey);
      }

      // Build FFmpeg command for streaming
      const ffmpegArgs = this.buildFFmpegArgs(video.filename, config);
      
      log(`Starting RTMP stream for video ${videoId} with args: ${ffmpegArgs.join(' ')}`);
      
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      
      // Handle process events
      ffmpegProcess.stdout?.on('data', (data) => {
        log(`FFmpeg stdout: ${data}`);
      });
      
      ffmpegProcess.stderr?.on('data', (data) => {
        log(`FFmpeg stderr: ${data}`);
      });
      
      ffmpegProcess.on('close', (code) => {
        log(`FFmpeg process exited with code ${code}`);
        this.activeStreams.delete(streamKey);
        
        // If loop is enabled, automatically play next video
        if (this.loopEnabled) {
          this.playNextVideo(videoId, config);
        } else {
          // Update stream status to offline
          storage.createOrUpdateStreamStatus({
            status: 'offline',
            viewerCount: 0,
            uptime: '00:00:00',
            currentVideoId: null,
            startedAt: null,
            loopPlaylist: false,
          });
        }
      });
      
      ffmpegProcess.on('error', (error) => {
        log(`FFmpeg error: ${error.message}`);
        this.activeStreams.delete(streamKey);
        
        // Update stream status to error
        storage.createOrUpdateStreamStatus({
          status: 'error',
          viewerCount: 0,
          uptime: '00:00:00',
          currentVideoId: null,
          startedAt: null,
          loopPlaylist: false,
        });
      });
      
      // Store the process and config
      this.activeStreams.set(streamKey, ffmpegProcess);
      this.streamConfigs.set(streamKey, config);
      
      return true;
    } catch (error) {
      log(`Error starting stream: ${error}`);
      return false;
    }
  }

  stopStream(streamKey: string): boolean {
    try {
      const process = this.activeStreams.get(streamKey);
      if (process) {
        process.kill('SIGTERM');
        this.activeStreams.delete(streamKey);
        this.streamConfigs.delete(streamKey);
        log(`Stopped stream: ${streamKey}`);
        return true;
      }
      return false;
    } catch (error) {
      log(`Error stopping stream: ${error}`);
      return false;
    }
  }

  stopAllStreams(): void {
    for (const [streamKey] of this.activeStreams) {
      this.stopStream(streamKey);
    }
  }

  isStreamActive(streamKey: string): boolean {
    return this.activeStreams.has(streamKey);
  }

  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  setLoopEnabled(enabled: boolean): void {
    this.loopEnabled = enabled;
  }

  isLoopEnabled(): boolean {
    return this.loopEnabled;
  }

  private async playNextVideo(currentVideoId: number, config: RTMPConfig): Promise<void> {
    try {
      // Get all videos ordered by playlist order
      const videos = await storage.getVideos();
      if (videos.length === 0) {
        log('No videos available for loop playback');
        return;
      }

      // Find current video index
      const currentIndex = videos.findIndex(v => v.id === currentVideoId);
      
      // Get next video (loop to first if at end)
      const nextIndex = (currentIndex + 1) % videos.length;
      const nextVideo = videos[nextIndex];

      log(`Loop playback: Moving from video ${currentVideoId} to video ${nextVideo.id} (${nextVideo.title})`);

      // Update stream status with next video
      await storage.createOrUpdateStreamStatus({
        status: 'live',
        viewerCount: Math.floor(Math.random() * 2000) + 100,
        uptime: '00:00:00',
        currentVideoId: nextVideo.id,
        startedAt: new Date(),
        loopPlaylist: true,
      });

      // Start streaming next video with a slight delay
      setTimeout(() => {
        this.startStream(nextVideo.id, config);
      }, 1000);

    } catch (error) {
      log(`Error in loop playback: ${error}`);
      // Fall back to offline status
      await storage.createOrUpdateStreamStatus({
        status: 'offline',
        viewerCount: 0,
        uptime: '00:00:00',
        currentVideoId: null,
        startedAt: null,
        loopPlaylist: false,
      });
    }
  }

  private buildFFmpegArgs(videoPath: string, config: RTMPConfig): string[] {
    const args = [
      '-re', // Read input at native frame rate
      '-i', `uploads/${videoPath}`, // Input file
      '-c:v', 'libx264', // Video codec
      '-c:a', 'aac', // Audio codec
      '-preset', 'veryfast', // Encoding preset
      '-maxrate', config.bitrate, // Maximum bitrate
      '-bufsize', `${parseInt(config.bitrate) * 2}k`, // Buffer size
      '-vf', `scale=-2:${this.getResolutionHeight(config.quality)}`, // Scale video
      '-g', `${config.fps * 2}`, // GOP size
      '-r', config.fps.toString(), // Frame rate
      '-f', 'flv', // Output format
    ];

    // Add output URL
    if (config.outputUrl.includes('rtmp://')) {
      args.push(`${config.outputUrl}/${config.streamKey}`);
    } else {
      args.push(`rtmp://localhost:1935/live/${config.streamKey}`);
    }

    return args;
  }

  private getResolutionHeight(quality: string): number {
    switch (quality) {
      case '1080p': return 1080;
      case '720p': return 720;
      case '480p': return 480;
      case '360p': return 360;
      default: return 720;
    }
  }

  // Stream to multiple platforms
  async streamToMultiplePlatforms(videoId: number, platforms: Array<{platform: string, url: string, key: string}>): Promise<boolean> {
    try {
      const video = await storage.getVideo(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      const streamKey = `multistream_${videoId}`;
      
      // Stop existing stream if running
      if (this.activeStreams.has(streamKey)) {
        this.stopStream(streamKey);
      }

      // Build FFmpeg command for multi-platform streaming
      const args = [
        '-re',
        '-i', `uploads/${video.filename}`,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'veryfast',
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-vf', 'scale=-2:720',
        '-g', '60',
        '-r', '30',
        '-f', 'flv',
      ];

      // Add multiple outputs
      platforms.forEach(platform => {
        args.push('-f', 'flv', `${platform.url}/${platform.key}`);
      });

      log(`Starting multi-platform stream for video ${videoId}`);
      
      const ffmpegProcess = spawn('ffmpeg', args);
      
      // Handle process events (same as single stream)
      ffmpegProcess.stdout?.on('data', (data) => {
        log(`Multi-stream FFmpeg stdout: ${data}`);
      });
      
      ffmpegProcess.stderr?.on('data', (data) => {
        log(`Multi-stream FFmpeg stderr: ${data}`);
      });
      
      ffmpegProcess.on('close', (code) => {
        log(`Multi-stream FFmpeg process exited with code ${code}`);
        this.activeStreams.delete(streamKey);
      });
      
      ffmpegProcess.on('error', (error) => {
        log(`Multi-stream FFmpeg error: ${error.message}`);
        this.activeStreams.delete(streamKey);
      });
      
      this.activeStreams.set(streamKey, ffmpegProcess);
      
      return true;
    } catch (error) {
      log(`Error starting multi-platform stream: ${error}`);
      return false;
    }
  }
}

export const rtmpManager = new RTMPStreamManager();

// Cleanup on process exit
process.on('SIGINT', () => {
  log('Shutting down RTMP streams...');
  rtmpManager.stopAllStreams();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down RTMP streams...');
  rtmpManager.stopAllStreams();
  process.exit(0);
});