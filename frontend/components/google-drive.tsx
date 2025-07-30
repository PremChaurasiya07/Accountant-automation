"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Cloud, 
  Upload, 
  Download, 
  Trash2, 
  Folder, 
  File, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  parents?: string[];
}

interface DriveStatus {
  authenticated: boolean;
  expires_at?: string;
  error?: string;
}

const GoogleDriveComponent: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<DriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupName, setBackupName] = useState('');
  const [includePreviousData, setIncludePreviousData] = useState(true);
  const [folderName, setFolderName] = useState('');
  const [userId, setUserId] = useState(''); // This should come from your auth context

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Get user ID from your auth context
  useEffect(() => {
    // Replace this with your actual user ID retrieval logic
    const getUserId = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUserId(data.user.id);
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    };
    getUserId();
  }, []);

  // Check authentication status
  const checkAuthStatus = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/drive/status?user_id=${userId}`);
      const status = await response.json();
      setAuthStatus(status);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, [userId]);

  // Get Google Drive authentication URL
  const getAuthUrl = async () => {
    if (!userId) {
      toast.error('User ID not available');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/drive/auth/url?user_id=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        // Open the auth URL in a new window
        window.open(data.auth_url, '_blank', 'width=500,height=600');
        toast.success('Authentication window opened. Please complete the process.');
      } else {
        toast.error('Failed to get authentication URL');
      }
    } catch (error) {
      toast.error('Error getting authentication URL');
    } finally {
      setIsLoading(false);
    }
  };

  // Create backup
  const createBackup = async () => {
    if (!userId) {
      toast.error('User ID not available');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/drive/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          include_previous_data: includePreviousData,
          backup_name: backupName || undefined
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Backup created successfully: ${data.folder_name}`);
        setBackupName('');
        // Refresh file list
        listFiles();
      } else {
        toast.error(data.detail || 'Failed to create backup');
      }
    } catch (error) {
      toast.error('Error creating backup');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload file
  const uploadFile = async () => {
    if (!userId || !selectedFile) {
      toast.error('Please select a file and ensure user ID is available');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('user_id', userId);
    if (folderName) {
      formData.append('folder_name', folderName);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/drive/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`File uploaded successfully: ${data.file_name}`);
        setSelectedFile(null);
        setFolderName('');
        // Refresh file list
        listFiles();
      } else {
        toast.error(data.detail || 'Failed to upload file');
      }
    } catch (error) {
      toast.error('Error uploading file');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // List files
  const listFiles = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/drive/files?user_id=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setFiles(data.files || []);
      } else {
        toast.error('Failed to list files');
      }
    } catch (error) {
      toast.error('Error listing files');
    }
  };

  // Delete file
  const deleteFile = async (fileId: string, fileName: string) => {
    if (!userId) return;

    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/drive/files/${fileId}?user_id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`File deleted: ${fileName}`);
        // Refresh file list
        listFiles();
      } else {
        toast.error('Failed to delete file');
      }
    } catch (error) {
      toast.error('Error deleting file');
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Load files on component mount
  useEffect(() => {
    if (authStatus?.authenticated) {
      listFiles();
    }
  }, [authStatus?.authenticated, userId]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Drive Integration</h1>
          <p className="text-muted-foreground">
            Backup your data and upload files to Google Drive
          </p>
        </div>
        <Button
          onClick={checkAuthStatus}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Authentication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authStatus ? (
            <div className="flex items-center gap-4">
              {authStatus.authenticated ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-600">Connected to Google Drive</p>
                    {authStatus.expires_at && (
                      <p className="text-sm text-muted-foreground">
                        Expires: {new Date(authStatus.expires_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-600">Not connected to Google Drive</p>
                    {authStatus.error && (
                      <p className="text-sm text-muted-foreground">{authStatus.error}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Checking authentication status...</p>
          )}
          
          {(!authStatus?.authenticated) && (
            <Button
              onClick={getAuthUrl}
              disabled={isLoading}
              className="mt-4"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Google Drive
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Backup Section */}
      {authStatus?.authenticated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Create Backup
            </CardTitle>
            <CardDescription>
              Backup your current data to Google Drive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup-name">Backup Name (Optional)</Label>
              <Input
                id="backup-name"
                placeholder="e.g., Monthly Backup"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="include-previous"
                checked={includePreviousData}
                onCheckedChange={setIncludePreviousData}
              />
              <Label htmlFor="include-previous">
                Include previous backup data
              </Label>
            </div>
            
            <Button
              onClick={createBackup}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* File Upload Section */}
      {authStatus?.authenticated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload File
            </CardTitle>
            <CardDescription>
              Upload files to Google Drive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                disabled={isLoading}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name (Optional)</Label>
              <Input
                id="folder-name"
                placeholder="e.g., Documents"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            {uploadProgress > 0 && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
            
            <Button
              onClick={uploadFile}
              disabled={!selectedFile || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      {authStatus?.authenticated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Your Files
            </CardTitle>
            <CardDescription>
              Files stored in your Google Drive
            </CardDescription>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No files found. Upload some files to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {file.mimeType === 'application/vnd.google-apps.folder' ? (
                        <Folder className="h-4 w-4 text-blue-500" />
                      ) : (
                        <File className="h-4 w-4 text-gray-500" />
                      )}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(file.createdTime).toLocaleDateString()}
                          {file.size && ` • ${(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.mimeType === 'application/vnd.google-apps.folder' && (
                        <Badge variant="secondary">Folder</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFile(file.id, file.name)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GoogleDriveComponent; 