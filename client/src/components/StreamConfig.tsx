import { useState } from "react";
import { Play, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertStreamConfigSchema } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const formSchema = insertStreamConfigSchema.extend({
  streamKey: z.string().min(1, "Stream key is required"),
  rtmpUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

export default function StreamConfig() {
  const [showStreamKey, setShowStreamKey] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: streamConfig } = useQuery({
    queryKey: ['/api/stream-config'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: streamConfig?.platform || 'youtube',
      streamKey: streamConfig?.streamKey || '',
      rtmpUrl: streamConfig?.rtmpUrl || '',
      resolution: streamConfig?.resolution || '1920x1080',
      framerate: streamConfig?.framerate || 30,
      bitrate: streamConfig?.bitrate || 2500,
      audioQuality: streamConfig?.audioQuality || 128,
      isActive: true,
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest('POST', '/api/stream-config', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stream-config'] });
      toast({
        title: "Success",
        description: "Stream configuration saved!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
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

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/stream/test');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Connection test successful!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Connection test failed",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    saveConfigMutation.mutate(data);
  };

  const handleStartStream = () => {
    startStreamMutation.mutate();
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const bitrateValue = form.watch('bitrate');

  return (
    <div className="bg-white rounded-lg shadow-material p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Stream Configuration</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Platform Selection */}
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="custom">Custom RTMP</SelectItem>
                    <SelectItem value="twitch">Twitch</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Stream Key */}
          <FormField
            control={form.control}
            name="streamKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stream Key</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showStreamKey ? "text" : "password"}
                      placeholder="Enter your stream key"
                      {...field}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute inset-y-0 right-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowStreamKey(!showStreamKey)}
                    >
                      {showStreamKey ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* RTMP URL */}
          <FormField
            control={form.control}
            name="rtmpUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RTMP URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="rtmp://your-server.com/live"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Video Quality */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1920x1080">1920x1080</SelectItem>
                      <SelectItem value="1280x720">1280x720</SelectItem>
                      <SelectItem value="854x480">854x480</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="framerate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Framerate</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">30 fps</SelectItem>
                      <SelectItem value="25">25 fps</SelectItem>
                      <SelectItem value="24">24 fps</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Bitrate */}
          <FormField
            control={form.control}
            name="bitrate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bitrate (kbps)</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Slider
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={500}
                      max={6000}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>500</span>
                      <span className="font-medium">{bitrateValue}</span>
                      <span>6000</span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Audio Settings */}
          <FormField
            control={form.control}
            name="audioQuality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Audio Quality</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="128">128 kbps</SelectItem>
                    <SelectItem value="96">96 kbps</SelectItem>
                    <SelectItem value="64">64 kbps</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button 
              type="button"
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleStartStream}
              disabled={startStreamMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Stream
            </Button>
            <Button 
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
