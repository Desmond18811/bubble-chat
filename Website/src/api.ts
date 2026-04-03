/**
 * Centralized API utility for interacting with the Bubble Chat Backend.
 * Allows easy fetching from the MeetPage and MessagesPage.
 */


const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';


// Helper to grab token if you're using localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token'); // Adjust based on how you store your JWT
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * =======================
 * Authentication (Auth)
 * =======================
 */

export const register = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to register');
  }
  return res.json();
};

export const verifyOTP = async (email: string, otp: string) => {
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to verify OTP');
  }
  return res.json();
};

export const login = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to login');
  }
  return res.json();
};

export const forgotPassword = async (email: string) => {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to request reset');
  }
  return res.json();
};

export const resetPassword = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to reset password');
  }
  return res.json();
};


/**
 * =======================
 * Authentication / Users
 * =======================
 */

export const getContacts = async (searchQuery: string = '') => {
  const res = await fetch(`${BASE_URL}/user/contacts?search=${encodeURIComponent(searchQuery)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
};

export const getUserStatus = async (userId: string) => {
  const res = await fetch(`${BASE_URL}/user/status/${userId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
};

export const getOnlineScannedUsers = async () => {
  const res = await fetch(`${BASE_URL}/user/online-scanner`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to run online scanner');
  return res.json();
};

/**
 * =======================
 * Chats & Groups
 * =======================
 */

export const accessOrCreateChat = async (userId: string) => {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Failed to access chat');
  return res.json();
};

export const fetchAllUserChats = async () => {
  const res = await fetch(`${BASE_URL}/chat`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch user chats');
  return res.json();
};

export const createGroupChat = async (name: string, users: string[]) => {
  const res = await fetch(`${BASE_URL}/chat/group`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, users }),
  });
  if (!res.ok) throw new Error('Failed to create group');
  return res.json();
};

/**
 * =======================
 * Messages
 * =======================
 */

export const fetchMessages = async (chatId: string) => {
  const res = await fetch(`${BASE_URL}/message/${chatId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
};

export const sendTextMessage = async (chatId: string, content: string) => {
  const res = await fetch(`${BASE_URL}/message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ chatId, content }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
};

/**
 * Upload an attachment/voice note to a message.
 * Note: Body must be FormData!
 */
export const sendMediaMessage = async (chatId: string, file: File, content?: string) => {
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  formData.append('chatId', chatId);
  if (content) formData.append('content', content);
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/message`, {
    method: 'POST',
    // Do NOT set Content-Type header manually here; let browser inject it with the boundary 
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to upload media message');
  return res.json();
};

/**
 * =======================
 * Stories
 * =======================
 */

export const fetchStories = async () => {
  const res = await fetch(`${BASE_URL}/story`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch stories');
  return res.json();
};

export const uploadStory = async (file: File, textContent?: string) => {
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  if (textContent) formData.append('textContent', textContent);
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/story`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to upload story');
  return res.json();
};
