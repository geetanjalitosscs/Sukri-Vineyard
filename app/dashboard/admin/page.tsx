"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Settings, Shield, Database, Thermometer, Camera, Fingerprint, Wind, Plus, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { devicesService, usersService } from "@/api";

export default function AdminDashboard() {
  // All hooks must be called before any conditional returns
  const [devicesData, setDevicesData] = useState<any>({ iotDevices: [], cameras: [], attendanceDevices: [] });
  const [usersData, setUsersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [isAttendanceDeviceDialogOpen, setIsAttendanceDeviceDialogOpen] = useState(false);
  const [isThresholdDialogOpen, setIsThresholdDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<'iot' | 'camera' | 'attendance'>('iot');
  const [newDevice, setNewDevice] = useState({
    name: '',
    location: '',
    model: '',
    type: 'biometric',
    status: 'active',
  });
  const [thresholds, setThresholds] = useState({
    temperatureMin: 18,
    temperatureMax: 28,
    co2Min: 3000,
    co2Max: 5000,
    co2RefillFrequency: 7,
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [devices, cameras, users] = await Promise.all([
          devicesService.getAll(),
          devicesService.getCameras(),
          usersService.getAll(),
        ]);
        
        // devices.getAll() returns { iotDevices, cameras, attendanceDevices }
        setDevicesData({
          iotDevices: devices?.iotDevices || [],
          cameras: cameras || [],
          attendanceDevices: devices?.attendanceDevices || [],
        });
        setUsersData(users);
      } catch (error) {
        console.error('Failed to fetch admin dashboard data:', error);
        setDevicesData({ iotDevices: [], cameras: [], attendanceDevices: [] });
        setUsersData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const { iotDevices, cameras, attendanceDevices } = devicesData;
  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6 w-full min-w-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Administrator Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System administration and management
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold mt-1">45</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Roles</p>
                  <p className="text-2xl font-bold mt-1">9</p>
                </div>
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">System Health</p>
                  <p className="text-2xl font-bold mt-1">98%</p>
                </div>
                <Database className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Configurations</p>
                  <p className="text-2xl font-bold mt-1">12</p>
                </div>
                <Settings className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Management */}
        <div className="space-y-4">
          {/* IoT Devices */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base font-semibold">IoT Devices</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => {
                    setDeviceType('iot');
                    setNewDevice({ name: '', location: '', model: '', type: 'biometric', status: 'active' });
                    setIsDeviceDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Register Device
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {iotDevices.map((device: any) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border/30 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Thermometer className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {device.location} • {device.model}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={device.status === "active" ? "success" : "destructive"} className="text-[10px] px-2 py-0.5">
                        {device.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedDevice(device);
                          setIsThresholdDialogOpen(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cameras */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base font-semibold">Cameras</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => {
                    setDeviceType('camera');
                    setNewDevice({ name: '', location: '', model: '', type: 'biometric', status: 'active' });
                    setIsCameraDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Camera
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {cameras.map((camera: any) => (
                  <div
                    key={camera.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border/30 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Camera className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{camera.name}</p>
                        <p className="text-xs text-muted-foreground">{camera.location}</p>
                      </div>
                    </div>
                    <Badge variant={camera.status === "active" ? "success" : "destructive"} className="text-[10px] px-2 py-0.5">
                      {camera.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Devices */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base font-semibold">Attendance Devices</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => {
                    setDeviceType('attendance');
                    setNewDevice({ name: '', location: '', model: '', type: 'biometric', status: 'active' });
                    setIsAttendanceDeviceDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Register Device
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {attendanceDevices.map((device: any) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border/30 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {device.location} • {device.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={device.status === "active" ? "success" : "destructive"} className="text-[10px] px-2 py-0.5">
                        {device.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {device.totalScans || 0} scans
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Threshold Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base font-semibold">System Thresholds</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsThresholdDialogOpen(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Settings className="w-4 h-4" />
                  Configure
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-md border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Temperature</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min: {thresholds.temperatureMin}°C • Max: {thresholds.temperatureMax}°C
                  </p>
                </div>
                <div className="p-3 rounded-md border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">CO₂ Levels</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min: {thresholds.co2Min} ppm • Max: {thresholds.co2Max} ppm
                  </p>
                </div>
                <div className="p-3 rounded-md border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">CO₂ Refill Frequency</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Every {thresholds.co2RefillFrequency} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Threshold Configuration Dialog */}
        <Dialog open={isThresholdDialogOpen} onOpenChange={setIsThresholdDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Configure System Thresholds</DialogTitle>
              <DialogDescription>
                Set alert thresholds for temperature, CO₂ levels, and refill frequency
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Temperature Range (°C)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Minimum</label>
                    <input
                      type="number"
                      value={thresholds.temperatureMin}
                      onChange={(e) =>
                        setThresholds({ ...thresholds, temperatureMin: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Maximum</label>
                    <input
                      type="number"
                      value={thresholds.temperatureMax}
                      onChange={(e) =>
                        setThresholds({ ...thresholds, temperatureMax: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CO₂ Level Range (ppm)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Minimum</label>
                    <input
                      type="number"
                      value={thresholds.co2Min}
                      onChange={(e) =>
                        setThresholds({ ...thresholds, co2Min: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Maximum</label>
                    <input
                      type="number"
                      value={thresholds.co2Max}
                      onChange={(e) =>
                        setThresholds({ ...thresholds, co2Max: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CO₂ Refill Frequency (days)</label>
                <input
                  type="number"
                  value={thresholds.co2RefillFrequency}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, co2RefillFrequency: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    toast({
                      variant: "success",
                      title: "Thresholds Updated",
                      description: "System thresholds have been successfully configured.",
                    });
                    setIsThresholdDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsThresholdDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Register IoT Device Dialog */}
        <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register IoT Device</DialogTitle>
              <DialogDescription>
                Add a new IoT device to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Device Name</label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  placeholder="e.g., Temperature Sensor Block A"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                  placeholder="e.g., Block A - Center"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <input
                  type="text"
                  value={newDevice.model}
                  onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                  placeholder="e.g., DS18B20"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    if (!newDevice.name || !newDevice.location || !newDevice.model) {
                      toast({
                        variant: "destructive",
                        title: "Validation Error",
                        description: "Please fill all required fields.",
                      });
                      return;
                    }
                    toast({
                      variant: "success",
                      title: "Device Registered",
                      description: `${newDevice.name} has been successfully registered.`,
                    });
                    setIsDeviceDialogOpen(false);
                    setNewDevice({ name: '', location: '', model: '', type: 'biometric', status: 'active' });
                  }}
                  className="flex-1"
                >
                  Register Device
                </Button>
                <Button variant="outline" onClick={() => setIsDeviceDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Camera Dialog */}
        <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Camera</DialogTitle>
              <DialogDescription>
                Add a new camera to the monitoring system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Camera Name</label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  placeholder="e.g., Camera Block A"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                  placeholder="e.g., Block A - Main Zone"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    if (!newDevice.name || !newDevice.location) {
                      toast({
                        variant: "destructive",
                        title: "Validation Error",
                        description: "Please fill all required fields.",
                      });
                      return;
                    }
                    toast({
                      variant: "success",
                      title: "Camera Added",
                      description: `${newDevice.name} has been successfully added.`,
                    });
                    setIsCameraDialogOpen(false);
                    setNewDevice({ name: '', location: '', model: '', type: 'biometric', status: 'active' });
                  }}
                  className="flex-1"
                >
                  Add Camera
                </Button>
                <Button variant="outline" onClick={() => setIsCameraDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Register Attendance Device Dialog */}
        <Dialog open={isAttendanceDeviceDialogOpen} onOpenChange={setIsAttendanceDeviceDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register Attendance Device</DialogTitle>
              <DialogDescription>
                Add a new attendance device to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Device Name</label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  placeholder="e.g., Biometric Machine 1"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                  placeholder="e.g., Main Gate"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Device Type</label>
                <select
                  value={newDevice.type}
                  onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="biometric">Biometric</option>
                  <option value="face">Face Recognition</option>
                  <option value="qr">QR Code</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    if (!newDevice.name || !newDevice.location) {
                      toast({
                        variant: "destructive",
                        title: "Validation Error",
                        description: "Please fill all required fields.",
                      });
                      return;
                    }
                    toast({
                      variant: "success",
                      title: "Device Registered",
                      description: `${newDevice.name} has been successfully registered.`,
                    });
                    setIsAttendanceDeviceDialogOpen(false);
                    setNewDevice({ name: '', location: '', model: '', type: 'biometric', status: 'active' });
                  }}
                  className="flex-1"
                >
                  Register Device
                </Button>
                <Button variant="outline" onClick={() => setIsAttendanceDeviceDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

