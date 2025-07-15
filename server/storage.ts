import { videos, streamConfigs, streamStatus, type Video, type InsertVideo, type StreamConfig, type InsertStreamConfig, type StreamStatus, type InsertStreamStatus } from "@shared/schema";

export interface IStorage {
  // Video operations
  getVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;
  reorderPlaylist(videoIds: number[]): Promise<void>;
  
  // Stream config operations
  getStreamConfig(): Promise<StreamConfig | undefined>;
  createOrUpdateStreamConfig(config: InsertStreamConfig): Promise<StreamConfig>;
  
  // Stream status operations
  getStreamStatus(): Promise<StreamStatus | undefined>;
  createOrUpdateStreamStatus(status: InsertStreamStatus): Promise<StreamStatus>;
}

export class MemStorage implements IStorage {
  private videos: Map<number, Video>;
  private streamConfigs: Map<number, StreamConfig>;
  private streamStatuses: Map<number, StreamStatus>;
  private currentVideoId: number;
  private currentStreamConfigId: number;
  private currentStreamStatusId: number;

  constructor() {
    this.videos = new Map();
    this.streamConfigs = new Map();
    this.streamStatuses = new Map();
    this.currentVideoId = 1;
    this.currentStreamConfigId = 1;
    this.currentStreamStatusId = 1;
    
    // Initialize default stream status
    this.createOrUpdateStreamStatus({
      status: 'offline',
      viewerCount: 0,
      uptime: '00:00:00',
      currentVideoId: null,
      startedAt: null,
    });
  }

  async getVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).sort((a, b) => a.playlistOrder - b.playlistOrder);
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = this.currentVideoId++;
    const video: Video = {
      ...insertVideo,
      id,
      uploadedAt: new Date(),
      thumbnailUrl: insertVideo.thumbnailUrl || null,
    };
    this.videos.set(id, video);
    return video;
  }

  async updateVideo(id: number, updateVideo: Partial<InsertVideo>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;
    
    const updatedVideo = { ...video, ...updateVideo };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async deleteVideo(id: number): Promise<boolean> {
    return this.videos.delete(id);
  }

  async reorderPlaylist(videoIds: number[]): Promise<void> {
    videoIds.forEach((id, index) => {
      const video = this.videos.get(id);
      if (video) {
        this.videos.set(id, { ...video, playlistOrder: index });
      }
    });
  }

  async getStreamConfig(): Promise<StreamConfig | undefined> {
    return Array.from(this.streamConfigs.values()).find(config => config.isActive);
  }

  async createOrUpdateStreamConfig(config: InsertStreamConfig): Promise<StreamConfig> {
    const existingConfig = Array.from(this.streamConfigs.values()).find(c => c.isActive);
    
    if (existingConfig) {
      const updatedConfig = { ...existingConfig, ...config };
      this.streamConfigs.set(existingConfig.id, updatedConfig);
      return updatedConfig;
    } else {
      const id = this.currentStreamConfigId++;
      const streamConfig: StreamConfig = {
        ...config,
        id,
        isActive: true,
        rtmpUrl: config.rtmpUrl || null,
      };
      this.streamConfigs.set(id, streamConfig);
      return streamConfig;
    }
  }

  async getStreamStatus(): Promise<StreamStatus | undefined> {
    return Array.from(this.streamStatuses.values())[0];
  }

  async createOrUpdateStreamStatus(status: InsertStreamStatus): Promise<StreamStatus> {
    const existingStatus = Array.from(this.streamStatuses.values())[0];
    
    if (existingStatus) {
      const updatedStatus = { ...existingStatus, ...status };
      this.streamStatuses.set(existingStatus.id, updatedStatus);
      return updatedStatus;
    } else {
      const id = this.currentStreamStatusId++;
      const streamStatus: StreamStatus = {
        ...status,
        id,
        viewerCount: status.viewerCount || null,
        uptime: status.uptime || null,
        currentVideoId: status.currentVideoId || null,
        startedAt: status.startedAt || null,
      };
      this.streamStatuses.set(id, streamStatus);
      return streamStatus;
    }
  }
}

export const storage = new MemStorage();
