import { useState, useRef } from "react";
import { GripVertical, Play, Edit, Trash2, Plus, CheckCircle, Circle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, StreamStatus } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function PlaylistManager() {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  const { data: streamStatus } = useQuery<StreamStatus>({
    queryKey: ['/api/stream-status'],
    refetchInterval: 5000,
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Success",
        description: "Video deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete video",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (videoIds: number[]) => {
      await apiRequest('POST', '/api/videos/reorder', { videoIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reorder playlist",
        variant: "destructive",
      });
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      await apiRequest('PUT', `/api/videos/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      setEditingVideo(null);
      toast({
        title: "Success",
        description: "Video updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update video",
        variant: "destructive",
      });
    },
  });

  const setCurrentVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      await apiRequest('POST', '/api/stream/set-current', { videoId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stream-status'] });
      toast({
        title: "Success",
        description: "Video set as current!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set current video",
        variant: "destructive",
      });
    },
  });

  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', file.name);
      formData.append('duration', '00:00');
      
      const response = await fetch('/api/videos', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Success",
        description: "Video uploaded successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload video",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === targetId) return;

    const reorderedVideos = [...videos];
    const draggedIndex = reorderedVideos.findIndex(v => v.id === draggedItem);
    const targetIndex = reorderedVideos.findIndex(v => v.id === targetId);

    const [draggedVideo] = reorderedVideos.splice(draggedIndex, 1);
    reorderedVideos.splice(targetIndex, 0, draggedVideo);

    const videoIds = reorderedVideos.map(v => v.id);
    reorderMutation.mutate(videoIds);

    setDraggedItem(null);
  };

  const handleDeleteVideo = (id: number) => {
    if (confirm('Are you sure you want to delete this video?')) {
      deleteVideoMutation.mutate(id);
    }
  };

  const handleEditVideo = (id: number) => {
    const video = videos.find(v => v.id === id);
    if (video) {
      setEditingVideo(video);
      setEditTitle(video.title);
    }
  };

  const handlePlayVideo = (id: number) => {
    setCurrentVideoMutation.mutate(id);
  };

  const getNextVideo = () => {
    if (!streamStatus?.currentVideoId) return null;
    const currentIndex = videos.findIndex(v => v.id === streamStatus.currentVideoId);
    return currentIndex >= 0 && currentIndex < videos.length - 1 
      ? videos[currentIndex + 1] 
      : null;
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Invalid file type. Only MP4, AVI, and MOV files are allowed.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size too large. Maximum size is 500MB.",
          variant: "destructive",
        });
        return;
      }
      
      uploadVideoMutation.mutate(file);
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleSaveEdit = () => {
    if (editingVideo && editTitle.trim()) {
      updateVideoMutation.mutate({ id: editingVideo.id, title: editTitle.trim() });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-material p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <div className="w-16 h-12 bg-gray-300 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-material p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Playlist Management</h2>
          <div className="flex items-center space-x-4 mt-1">
            <span className="text-sm text-gray-500">{videos.length} videos</span>
            {streamStatus?.currentVideoId && (
              <div className="flex items-center space-x-2">
                <Circle className="h-3 w-3 text-primary" />
                <span className="text-sm text-gray-600">
                  Current: {videos.find(v => v.id === streamStatus.currentVideoId)?.title || 'Unknown'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {streamStatus?.status === 'live' && (
            <Badge variant="destructive" className="text-xs">
              Live Stream
            </Badge>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            title="Upload new video"
            onClick={handleFileUpload}
            disabled={uploadVideoMutation.isPending}
          >
            {uploadVideoMutation.isPending ? (
              <>
                <Upload className="h-4 w-4 mr-1 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No videos in playlist. Upload some videos to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => {
            const isCurrentVideo = video.id === streamStatus?.currentVideoId;
            const isStreaming = streamStatus?.status === 'live';
            const nextVideo = getNextVideo();
            const isNextVideo = nextVideo?.id === video.id;
            
            return (
              <div
                key={video.id}
                draggable
                onDragStart={(e) => handleDragStart(e, video.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, video.id)}
                className={`flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-move ${
                  isCurrentVideo 
                    ? 'bg-blue-50 border-2 border-blue-200' 
                    : isNextVideo
                    ? 'bg-green-50 border-2 border-green-200'
                    : 'bg-gray-50 border-2 border-transparent'
                }`}
              >
                <div className="flex-shrink-0">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-shrink-0 w-16 h-12 bg-gray-300 rounded overflow-hidden relative">
                  <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                  {isCurrentVideo && (
                    <div className="absolute -top-1 -right-1">
                      <CheckCircle className="h-4 w-4 text-primary bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-sm font-medium truncate ${
                      isCurrentVideo ? 'text-blue-900' : isNextVideo ? 'text-green-900' : 'text-gray-900'
                    }`}>
                      {video.title}
                    </h3>
                    {isCurrentVideo && (
                      <Badge variant="secondary" className="text-xs">
                        {isStreaming ? 'Live' : 'Selected'}
                      </Badge>
                    )}
                    {isNextVideo && (
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200">
                        Next
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">{video.duration}</p>
                    <span className="text-xs text-gray-400">•</span>
                    <p className="text-xs text-gray-500">
                      {(video.fileSize / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`p-1 h-8 w-8 ${
                      isCurrentVideo 
                        ? 'bg-blue-100 hover:bg-blue-200' 
                        : ''
                    }`}
                    onClick={() => handlePlayVideo(video.id)}
                    title={isCurrentVideo ? 'Currently selected' : 'Set as current video'}
                  >
                    {isCurrentVideo ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <Play className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="p-1 h-8 w-8"
                    onClick={() => handleEditVideo(video.id)}
                    title="Edit video"
                  >
                    <Edit className="h-4 w-4 text-warning" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="p-1 h-8 w-8"
                    onClick={() => handleDeleteVideo(video.id)}
                    disabled={deleteVideoMutation.isPending}
                    title="Delete video"
                  >
                    <Trash2 className="h-4 w-4 text-error" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Video Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter video title"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingVideo(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateVideoMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/mp4,video/avi,video/mov,video/quicktime"
        style={{ display: 'none' }}
      />
    </div>
  );
}
