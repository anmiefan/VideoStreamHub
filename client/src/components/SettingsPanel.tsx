import { useState } from "react";
import { Settings, X, Monitor, Wifi, Database, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);

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
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Theme</h4>
                    <p className="text-sm text-gray-600">Choose your preferred theme</p>
                  </div>
                  <Badge variant="outline">Light</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-refresh</h4>
                    <p className="text-sm text-gray-600">Automatically refresh stream status</p>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
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
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Default Quality</h4>
                    <p className="text-sm text-gray-600">Default streaming quality for new configurations</p>
                  </div>
                  <Badge variant="outline">1080p</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Buffer Size</h4>
                    <p className="text-sm text-gray-600">Video buffer size in seconds</p>
                  </div>
                  <Badge variant="outline">5s</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-restart</h4>
                    <p className="text-sm text-gray-600">Automatically restart failed streams</p>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
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
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <Database className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    StreamFlow is a web-based video streaming application that allows you to upload videos, 
                    manage playlists, and stream content to various platforms with real-time controls.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}