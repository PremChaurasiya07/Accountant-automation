// Utility functions for Google Drive authentication

export interface DriveAuthState {
  authenticated: boolean;
  expires_at?: string;
  error?: string;
}

export interface AuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface BackupRequest {
  user_id: string;
  include_previous_data: boolean;
  backup_name?: string;
}

export interface FileUploadRequest {
  user_id: string;
  folder_name?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Get the current user ID from the authentication context
 * This should be implemented based on your auth system
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.user.id;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

/**
 * Check if user is authenticated with Google Drive
 */
export const checkDriveAuthStatus = async (userId: string): Promise<DriveAuthState> => {
  try {
    const response = await fetch(`${API_BASE_URL}/drive/status?user_id=${userId}`);
    return await response.json();
  } catch (error) {
    console.error('Error checking drive auth status:', error);
    return {
      authenticated: false,
      error: 'Failed to check authentication status'
    };
  }
};

/**
 * Get Google Drive authentication URL
 */
export const getDriveAuthUrl = async (userId: string): Promise<AuthUrlResponse | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/drive/auth/url?user_id=${userId}`);
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error getting auth URL:', error);
    return null;
  }
};

/**
 * Handle OAuth callback
 * This function should be called when the user completes the OAuth flow
 */
export const handleAuthCallback = async (code: string, state: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/drive/auth/callback?code=${code}&state=${state}`);
    return response.ok;
  } catch (error) {
    console.error('Error handling auth callback:', error);
    return false;
  }
};

/**
 * Create a backup of user data
 */
export const createBackup = async (request: BackupRequest): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/drive/backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

/**
 * Upload a file to Google Drive
 */
export const uploadFile = async (
  file: File, 
  userId: string, 
  folderName?: string
): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    if (folderName) {
      formData.append('folder_name', folderName);
    }

    const response = await fetch(`${API_BASE_URL}/drive/upload`, {
      method: 'POST',
      body: formData,
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * List files in Google Drive
 */
export const listFiles = async (userId: string, folderId?: string): Promise<any> => {
  try {
    let url = `${API_BASE_URL}/drive/files?user_id=${userId}`;
    if (folderId) {
      url += `&folder_id=${folderId}`;
    }
    
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
};

/**
 * Delete a file from Google Drive
 */
export const deleteFile = async (fileId: string, userId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/drive/files/${fileId}?user_id=${userId}`, {
      method: 'DELETE',
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Open Google Drive authentication in a popup window
 */
export const openAuthPopup = (authUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      authUrl,
      'google-drive-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      reject(new Error('Popup blocked by browser'));
      return;
    }

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        reject(new Error('Authentication cancelled'));
      }
    }, 1000);

    // Listen for messages from the popup
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
        popup.close();
        resolve(event.data.code);
      } else if (event.data.type === 'GOOGLE_DRIVE_AUTH_ERROR') {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
        popup.close();
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', messageListener);
  });
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 