import { useState } from "react";
import { GripVertical, Play, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PlaylistManager() {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
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
        <h2 className="text-lg font-semibold text-gray-900">Playlist Management</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{videos.length} videos</span>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No videos in playlist. Upload some videos to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div
              key={video.id}
              draggable
              onDragStart={(e) => handleDragStart(e, video.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, video.id)}
              className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-move"
            >
              <div className="flex-shrink-0">
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-shrink-0 w-16 h-12 bg-gray-300 rounded overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                  <Play className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">{video.title}</h3>
                <p className="text-xs text-gray-500">{video.duration}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="ghost" className="p-1 h-8 w-8">
                  <Play className="h-4 w-4 text-primary" />
                </Button>
                <Button size="sm" variant="ghost" className="p-1 h-8 w-8">
                  <Edit className="h-4 w-4 text-warning" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="p-1 h-8 w-8"
                  onClick={() => handleDeleteVideo(video.id)}
                  disabled={deleteVideoMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-error" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
