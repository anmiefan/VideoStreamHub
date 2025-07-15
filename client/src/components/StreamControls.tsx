import { Play, Square, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StreamStatus as StreamStatusType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function StreamControls() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: streamStatus } = useQuery<StreamStatusType>({
    queryKey: ['/api/stream-status'],
    refetchInterval: 5000,
  });

  const startStreamMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/stream/start');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stream-status'] });
      toast({
        title: "Success",
        description: "Stream started successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start stream",
        variant: "destructive",
      });
    },
  });

  const stopStreamMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/stream/stop');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stream-status'] });
      toast({
        title: "Success",
        description: "Stream stopped successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop stream",
        variant: "destructive",
      });
    },
  });

  const pauseStreamMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/stream/pause');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stream-status'] });
      toast({
        title: "Success",
        description: "Stream paused successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pause stream",
        variant: "destructive",
      });
    },
  });

  const restartStreamMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/stream/restart');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stream-status'] });
      toast({
        title: "Success",
        description: "Stream restarted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restart stream",
        variant: "destructive",
      });
    },
  });

  const isLoading = startStreamMutation.isPending || 
                   stopStreamMutation.isPending || 
                   pauseStreamMutation.isPending || 
                   restartStreamMutation.isPending;

  const canStart = streamStatus?.status === 'offline' || streamStatus?.status === 'error' || streamStatus?.status === 'paused';
  const canStop = streamStatus?.status === 'live' || streamStatus?.status === 'starting' || streamStatus?.status === 'paused';
  const canPause = streamStatus?.status === 'live';
  const canRestart = streamStatus?.status === 'error' || streamStatus?.status === 'offline';

  return (
    <div className="flex flex-wrap gap-3">
      {canStart && (
        <Button
          onClick={() => startStreamMutation.mutate()}
          disabled={isLoading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white"
        >
          <Play className="h-4 w-4 mr-2" />
          Start Stream
        </Button>
      )}

      {canStop && (
        <Button
          onClick={() => stopStreamMutation.mutate()}
          disabled={isLoading}
          className="flex-1 bg-error hover:bg-error/90 text-white"
        >
          <Square className="h-4 w-4 mr-2" />
          Stop Stream
        </Button>
      )}

      {canPause && (
        <Button
          onClick={() => pauseStreamMutation.mutate()}
          disabled={isLoading}
          variant="outline"
          className="flex-1"
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
      )}

      {canRestart && (
        <Button
          onClick={() => restartStreamMutation.mutate()}
          disabled={isLoading}
          variant="outline"
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restart
        </Button>
      )}
    </div>
  );
}
