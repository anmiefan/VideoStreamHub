import { useState, useEffect } from "react";
import { Settings, X, Monitor, Wifi, Database, Info, Moon, Sun, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  defaultQuality: string;
  bufferSize: number;
  autoRestart: boolean;
  refreshInterval: number;
}

export default function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  
  // Load settings from localStorage with defaults
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('streamflow-settings');
    return saved ? JSON.parse(saved) : {
      theme: 'light',
      autoRefresh: true,
      defaultQuality: '1280x720',
      bufferSize: 5,
      autoRestart: true,
      refreshInterval: 5000
    };
  });

  // Database connection status
  const { data: dbStatus, isLoading: dbLoading } = useQuery({
    queryKey: ['/api/stream-status'],
    refetchInterval: settings.autoRefresh ? settings.refreshInterval : false,
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('streamflow-settings', JSON.stringify(settings));
    
    // Apply theme changes
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Settings Updated",
      description: `${key.charAt(0).toUpperCase() + key.slice(1)} has been updated.`,
    });
  };

  const resetSettings = () => {
    const defaultSettings: Settings = {
      theme: 'light',
      autoRefresh: true,
      defaultQuality: '1280x720',
      bufferSize: 5,
      autoRestart: true,
      refreshInterval: 5000
    };
    setSettings(defaultSettings);
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure application settings, streaming preferences, and view system information.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="streaming">Streaming</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>Display</span>
                </CardTitle>
                <CardDescription>
                  Configure how the application looks and behaves
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="theme-select" className="font-medium">Theme</Label>
                    <p className="text-sm text-gray-600">Choose your preferred theme</p>
                  </div>
                  <Select value={settings.theme} onValueChange={(value: 'light' | 'dark') => updateSetting('theme', value)}>
                    <SelectTrigger id="theme-select" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-refresh" className="font-medium">Auto-refresh</Label>
                    <p className="text-sm text-gray-600">Automatically refresh stream status</p>
                  </div>
                  <Switch 
                    id="auto-refresh"
                    checked={settings.autoRefresh}
                    onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="refresh-interval" className="font-medium">Refresh Interval</Label>
                    <span className="text-sm text-gray-600">{settings.refreshInterval / 1000}s</span>
                  </div>
                  <Slider
                    id="refresh-interval"
                    value={[settings.refreshInterval]}
                    onValueChange={(value) => updateSetting('refreshInterval', value[0])}
                    min={1000}
                    max={30000}
                    step={1000}
                    className="w-full"
                    disabled={!settings.autoRefresh}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1s</span>
                    <span>30s</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="streaming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wifi className="h-5 w-5" />
                  <span>Streaming Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure streaming quality and performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="default-quality" className="font-medium">Default Quality</Label>
                    <p className="text-sm text-gray-600">Default streaming quality for new configurations</p>
                  </div>
                  <Select value={settings.defaultQuality} onValueChange={(value) => updateSetting('defaultQuality', value)}>
                    <SelectTrigger id="default-quality" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                      <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                      <SelectItem value="854x480">854x480 (SD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="buffer-size" className="font-medium">Buffer Size</Label>
                    <span className="text-sm text-gray-600">{settings.bufferSize}s</span>
                  </div>
                  <Slider
                    id="buffer-size"
                    value={[settings.bufferSize]}
                    onValueChange={(value) => updateSetting('bufferSize', value[0])}
                    min={1}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1s</span>
                    <span>30s</span>
                  </div>
                  <p className="text-sm text-gray-600">Video buffer size affects stream stability and latency</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-restart" className="font-medium">Auto-restart</Label>
                    <p className="text-sm text-gray-600">Automatically restart failed streams</p>
                  </div>
                  <Switch 
                    id="auto-restart"
                    checked={settings.autoRestart}
                    onCheckedChange={(checked) => updateSetting('autoRestart', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>About StreamFlow</span>
                </CardTitle>
                <CardDescription>
                  Information about this application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Version</span>
                    <span className="text-gray-600">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Build</span>
                    <span className="text-gray-600">Jan 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Database</span>
                    {dbLoading ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        <Database className="h-3 w-3 mr-1" />
                        Checking...
                      </Badge>
                    ) : dbStatus ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <Database className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        <Database className="h-3 w-3 mr-1" />
                        Error
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">FFmpeg</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      <Monitor className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    StreamFlow is a web-based video streaming application that allows you to upload videos, 
                    manage playlists, and stream content to various platforms with real-time controls.
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">Reset Settings</h4>
                      <p className="text-sm text-gray-600">Restore all settings to default values</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetSettings}
                      className="text-red-600 hover:text-red-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}