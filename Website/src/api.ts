/**
 * Centralized API utility for interacting with the Bubble Chat Backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const register = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const verifyOTP = async (email: string, otp: string) => {
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return handleResponse(res);
};

export const resendOTP = async (email: string) => {
  const res = await fetch(`${BASE_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
};

export const login = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const logoutUser = async () => {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const forgotPassword = async (email: string) => {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
};

export const resetPassword = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const searchUsers = async (query: string) => {
  const res = await fetch(`${BASE_URL}/user/search?search=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse(res);
  // Normalize across possible response shapes
  const users = data.users || data.data || data.results || [];
  return { users };
};

/** Fetch a single user's full profile for the right panel */
export const getUserProfile = async (userId: string) => {
  const res = await fetch(`${BASE_URL}/user/${userId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const getContacts = async (searchQuery = '') => {
  const res = await fetch(`${BASE_URL}/user/contacts?search=${encodeURIComponent(searchQuery)}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const addContact = async (identifier: string) => {
  const res = await fetch(`${BASE_URL}/user/contacts/add`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ identifier }),
  });
  return handleResponse(res);
};

export const getUserStatus = async (userId: string) => {
  const res = await fetch(`${BASE_URL}/user/status/${userId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const getOnlineScannedUsers = async () => {
  const res = await fetch(`${BASE_URL}/user/online-scanner`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Chats & Groups ───────────────────────────────────────────────────────────

export const accessOrCreateChat = async (userId: string) => {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
  return handleResponse(res);
};

export const fetchAllUserChats = async () => {
  const res = await fetch(`${BASE_URL}/chat`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const createGroupChat = async (name: string, users: string[]) => {
  const res = await fetch(`${BASE_URL}/chat/group`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, users }),
  });
  return handleResponse(res);
};

export const updateGroupChat = async (chatId: string, data: { chatName?: string; groupIcon?: string; groupDescription?: string }) => {
  const res = await fetch(`${BASE_URL}/chat/group/${chatId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const addToGroup = async (chatId: string, userId: string) => {
  const res = await fetch(`${BASE_URL}/chat/groupadd`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ chatId, userId }),
  });
  return handleResponse(res);
};

export const removeFromGroup = async (chatId: string, userId: string) => {
  const res = await fetch(`${BASE_URL}/chat/groupremove`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ chatId, userId }),
  });
  return handleResponse(res);
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const fetchMessages = async (chatId: string) => {
  const res = await fetch(`${BASE_URL}/message/${chatId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const sendTextMessage = async (
  chatId: string,
  content: string,
  opts?: { parent_message?: string; mentions?: string[]; is_forwarded?: boolean }
) => {
  const res = await fetch(`${BASE_URL}/message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ chatId, content, message_type: 'text', ...opts }),
  });
  return handleResponse(res);
};

/**
 * Upload an attachment / voice note as a message.
 * Passes message_type explicitly so backend stores the correct type.
 */
export const sendMediaMessage = async (
  chatId: string,
  file: File,
  opts?: { content?: string; parent_message?: string; message_type?: string; media_duration?: number }
) => {
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  formData.append('chatId', chatId);
  if (opts?.content) formData.append('content', opts.content);
  if (opts?.parent_message) formData.append('parent_message', opts.parent_message);
  if (opts?.media_duration !== undefined) formData.append('media_duration', opts.media_duration.toString());

  // Resolve message_type from mime if not provided
  const resolvedType =
    opts?.message_type ||
    (file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'voice'
          : 'file');

  formData.append('message_type', resolvedType);
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/message`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse(res);
};

/** Edit an existing message (own messages only) */
export const updateMessage = async (messageId: string, content: string) => {
  const res = await fetch(`${BASE_URL}/message/${messageId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  return handleResponse(res);
};

/** Delete a message for yourself only (soft-delete, always available) */
export const deleteMessageForMe = async (messageId: string) => {
  const res = await fetch(`${BASE_URL}/message/${messageId}/for-me`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Delete a message for everyone — sender only, within 2 minutes of sending */
export const deleteMessageForEveryone = async (messageId: string) => {
  const res = await fetch(`${BASE_URL}/message/${messageId}/for-everyone`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/**
 * Mark all messages in a chat as read by the current user.
 * Emits read receipts on the backend via socket.
 */
export const markMessagesRead = async (chatId: string) => {
  const res = await fetch(`${BASE_URL}/message/read/${chatId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Toggle a reaction emoji on a message */
export const reactToMessage = async (messageId: string, emoji: string) => {
  const res = await fetch(`${BASE_URL}/message/${messageId}/react`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ emoji }),
  });
  return handleResponse(res);
};

/** Block / Unblock a user */
export const blockUser = async (userId: string) => {
  const res = await fetch(`${BASE_URL}/user/block/${userId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Report a user for investigation */
export const reportUser = async (userId: string, reason: string) => {
  const res = await fetch(`${BASE_URL}/user/report/${userId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
};

/** Mute / Unmute a conversation */
export const muteChat = async (chatId: string) => {
  const res = await fetch(`${BASE_URL}/chat/mute/${chatId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Clear chat history for me */
export const clearChat = async (chatId: string) => {
  const res = await fetch(`${BASE_URL}/chat/clear/${chatId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Stories ──────────────────────────────────────────────────────────────────

export const fetchStories = async () => {
  const res = await fetch(`${BASE_URL}/story`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const uploadStory = async (
  file: File | undefined | null,
  textContent?: string,
  opts?: { bg_gradient?: string; text_color?: string }
) => {
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  if (textContent) formData.append('textContent', textContent);
  if (opts?.bg_gradient) formData.append('bg_gradient', opts.bg_gradient);
  if (opts?.text_color) formData.append('text_color', opts.text_color);
  if (file) formData.append('file', file);

  const res = await fetch(`${BASE_URL}/story`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse(res);
};

export const deleteStory = async (storyId: string) => {
  const res = await fetch(`${BASE_URL}/story/${storyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── E2EE ─────────────────────────────────────────────────────────────────────

/** Upload the user's ECDH public key for E2E encrypted messaging */
export const uploadPublicKey = async (publicKey: string) => {
  const res = await fetch(`${BASE_URL}/user/public-key`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ publicKey }),
  });
  return handleResponse(res);
};

/** Fetch another user's public key for encryption */
export const getPublicKey = async (userId: string) => {
  const res = await fetch(`${BASE_URL}/user/${userId}/public-key`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};



// /**
//  * Centralized API utility for interacting with the Bubble Chat Backend.
//  * Allows easy fetching from the MeetPage and MessagesPage.
//  */


// const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';


// // Helper to grab token if you're using localStorage
// const getAuthHeaders = () => {
//   const token = localStorage.getItem('access_token'); // Adjust based on how you store your JWT
//   return {
//     'Content-Type': 'application/json',
//     ...(token ? { Authorization: `Bearer ${token}` } : {}),
//   };
// };

// /**
//  * =======================
//  * Authentication (Auth)
//  * =======================
//  */

// export const register = async (data: any) => {
//   const res = await fetch(`${BASE_URL}/auth/register`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
//   if (!res.ok) {
//     const errorData = await res.json();
//     throw new Error(errorData.message || 'Failed to register');
//   }
//   return res.json();
// };

// export const verifyOTP = async (email: string, otp: string) => {
//   const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, otp }),
//   });
//   if (!res.ok) {
//     const errorData = await res.json();
//     throw new Error(errorData.message || 'Failed to verify OTP');
//   }
//   return res.json();
// };

// export const resendOTP = async (email: string) => {
//   const res = await fetch(`${BASE_URL}/auth/resend-otp`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email }),
//   });
//   if (!res.ok) {
//     const errorData = await res.json();
//     throw new Error(errorData.message || 'Failed to resend OTP');
//   }
//   return res.json();
// };

// export const logoutUser = async () => {
//   const res = await fetch(`${BASE_URL}/auth/logout`, {
//     method: 'POST',
//     headers: getAuthHeaders(),
//   });
//   if (!res.ok) {
//     const errorData = await res.json().catch(() => ({}));
//     throw new Error(errorData.message || 'Failed to logout');
//   }
//   return res.json();
// };

// export const login = async (data: any) => {
//   const res = await fetch(`${BASE_URL}/auth/login`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
//   if (!res.ok) {
//     const errorData = await res.json();
//     throw new Error(errorData.message || 'Failed to login');
//   }
//   return res.json();
// };

// export const forgotPassword = async (email: string) => {
//   const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email }),
//   });
//   if (!res.ok) {
//     const errorData = await res.json();
//     throw new Error(errorData.message || 'Failed to request reset');
//   }
//   return res.json();
// };

// export const resetPassword = async (data: any) => {
//   const res = await fetch(`${BASE_URL}/auth/reset-password`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
//   if (!res.ok) {
//     const errorData = await res.json();
//     throw new Error(errorData.message || 'Failed to reset password');
//   }
//   return res.json();
// };


// /**
//  * =======================
//  * Authentication / Users
//  * =======================
//  */

// export const getContacts = async (searchQuery: string = '') => {
//   const res = await fetch(`${BASE_URL}/user/contacts?search=${encodeURIComponent(searchQuery)}`, {
//     headers: getAuthHeaders(),
//   });
//   if (!res.ok) throw new Error('Failed to fetch contacts');
//   return res.json();
// };

// export const searchUsers = async (query: string) => {
//   const res = await fetch(`${BASE_URL}/user/search?search=${encodeURIComponent(query)}`, {
//     headers: getAuthHeaders(),
//   });
//   if (!res.ok) throw new Error('Failed to search users');
//   return res.json();
// };

// export const addContact = async (identifier: string) => {
//   const res = await fetch(`${BASE_URL}/user/contacts/add`, {
//     method: 'POST',
//     headers: getAuthHeaders(),
//     body: JSON.stringify({ identifier }),
//   });
//   if (!res.ok) throw new Error('Failed to add contact');
//   return res.json();
// };

// export const getUserStatus = async (userId: string) => {
//   const res = await fetch(`${BASE_URL}/user/status/${userId}`, {
//     headers: getAuthHeaders(),
//   });
//   if (!res.ok) throw new Error('Failed to fetch status');
//   return res.json();
// };

// export const getOnlineScannedUsers = async () => {
//   const res = await fetch(`${BASE_URL}/user/online-scanner`, {
//     headers: getAuthHeaders(),
//   });
//   if (!res.ok) throw new Error('Failed to run online scanner');
//   return res.json();
// };

// /**
//  * =======================
//  * Chats & Groups
//  * =======================
//  */

// export const accessOrCreateChat = async (userId: string) => {
//   const res = await fetch(`${BASE_URL}/chat`, {
//     method: 'POST',
//     headers: getAuthHeaders(),
//     body: JSON.stringify({ userId }),
//   });
//   if (!res.ok) throw new Error('Failed to access chat');
//   return res.json();
// };

// export const fetchAllUserChats = async () => {
//   const res = await fetch(`${BASE_URL}/chat`, {
//     headers: getAuthHeaders(),
//   });
//   if (!res.ok) throw new Error('Failed to fetch user chats');
//   return res.json();
// };

// export const createGroupChat = async (name: string, users: string[]) => {
//   const res = await fetch(`${BASE_URL}/chat/group`, {
//     method: 'POST',
//     headers: getAuthHeaders(),
//     body: JSON.stringify({ name, users }),
//   });
//   if (!res.ok) throw new Error('Failed to create group');
//   return res.json();
// };

// /**
//  * =======================
//  * Messages
//  * =======================
//  */

// export const fetchMessages = async (chatId: string) => {
//   const res = await fetch(`${BASE_URL}/message/${chatId}`, {
//     headers: getAuthHeaders(),
//   });
//   if (!res.ok) throw new Error('Failed to fetch messages');
//   return res.json();
// };

// export const sendTextMessage = async (chatId: string, content: string) => {
//   const res = await fetch(`${BASE_URL}/message`, {
//     method: 'POST',
//     headers: getAuthHeaders(),
//     body: JSON.stringify({ chatId, content }),
//   });
//   if (!res.ok) throw new Error('Failed to send message');
//   return res.json();
// };

// /**
//  * Upload an attachment/voice note to a message.
//  * Note: Body must be FormData!
//  */
// export const sendMediaMessage = async (chatId: string, file: File, content?: string) => {
//   const token = localStorage.getItem('access_token');
//   const formData = new FormData();
//   formData.append('chatId', chatId);
//   if (content) formData.append('content', content);
//   formData.append('file', file);

//   const res = await fetch(`${BASE_URL}/message`, {
//     method: 'POST',
//     // Do NOT set Content-Type header manually here; let browser inject it with the boundary 
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     body: formData,
//   });

//   if (!res.ok) throw new Error('Failed to upload media message');
//   return res.json();
// };

// /**
//  * =======================
//  * Stories
//  * =======================
//  */

// export const fetchStories = async () => {
//   const res = await fetch(`${BASE_URL}/story`, {
//     headers: getAuthHeaders(),
//   });
//   if (!res.ok) throw new Error('Failed to fetch stories');
//   return res.json();
// };

// export const uploadStory = async (file: File, textContent?: string) => {
//   const token = localStorage.getItem('access_token');
//   const formData = new FormData();
//   if (textContent) formData.append('textContent', textContent);
//   formData.append('file', file);

//   const res = await fetch(`${BASE_URL}/story`, {
//     method: 'POST',
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     body: formData,
//   });

//   if (!res.ok) throw new Error('Failed to upload story');
//   return res.json();
// };
