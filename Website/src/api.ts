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

export const setup2FA = async () => {
  const res = await fetch(`${BASE_URL}/auth/setup-2fa`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const verify2FA = async (token: string) => {
  const res = await fetch(`${BASE_URL}/auth/verify-2fa`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ token }),
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

/** Toggle Pin status for a chat */
export const toggleChatPin = async (chatId: string) => {
  const res = await fetch(`${BASE_URL}/chat/pin/${chatId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Toggle Pin status for a message */
export const toggleMessagePin = async (messageId: string) => {
  const res = await fetch(`${BASE_URL}/message/${messageId}/pin`, {
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

// ─── Chat Deletion ────────────────────────────────────────────────────────────

/** Delete a chat from your view — soft-delete, hides from list until re-added */
export const deleteChat = async (chatId: string) => {
  const res = await fetch(`${BASE_URL}/chat/${chatId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Workspace Files ──────────────────────────────────────────────────────────

/** Upload a file to a workspace bucket */
export const uploadWorkspaceFile = async (
  file: File,
  opts?: { name?: string; workspace?: string; source?: string; sourceReference?: string; tags?: string; description?: string }
) => {
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  formData.append('file', file);
  if (opts?.name) formData.append('name', opts.name);
  if (opts?.workspace) formData.append('workspace', opts.workspace);
  if (opts?.source) formData.append('source', opts.source);
  if (opts?.sourceReference) formData.append('sourceReference', opts.sourceReference);
  if (opts?.tags) formData.append('tags', opts.tags);
  if (opts?.description) formData.append('description', opts.description);
  const res = await fetch(`${BASE_URL}/workspace/file`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse(res);
};

/** Create an empty folder representation */
export const createWorkspaceFolder = async (name: string, workspace?: string) => {
  const res = await fetch(`${BASE_URL}/workspace/folder`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, workspace }),
  });
  return handleResponse(res);
};

/** List workspace files (filtered by workspace, type, source, or search) */
export const listWorkspaceFiles = async (params?: {
  workspace?: string;
  type?: string;
  source?: string;
  search?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.workspace) q.set('workspace', params.workspace);
  if (params?.type) q.set('type', params.type);
  if (params?.source) q.set('source', params.source);
  if (params?.search) q.set('search', params.search);
  const res = await fetch(`${BASE_URL}/workspace/file?${q.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Get public shared folder */
export const getSharedWorkspaceFolder = async (folderId: string) => {
  const res = await fetch(`${BASE_URL}/workspace/shared/${folderId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Delete a workspace file (owner only) */
export const deleteWorkspaceFile = async (fileId: string) => {
  const res = await fetch(`${BASE_URL}/workspace/file/${fileId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Manage file access — add/remove collaborators or toggle public */
export const manageWorkspaceFileAccess = async (
  fileId: string,
  payload: { action?: 'add' | 'remove'; userId?: string; isPublic?: boolean }
) => {
  const res = await fetch(`${BASE_URL}/workspace/file/${fileId}/access`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

/** Block or unblock a user from a file */
export const blockWorkspaceFileUser = async (
  fileId: string,
  userId: string,
  action: 'block' | 'unblock' = 'block'
) => {
  const res = await fetch(`${BASE_URL}/workspace/file/${fileId}/block`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, action }),
  });
  return handleResponse(res);
};

/** Get the secure proxy URL for a workspace file */
export const getWorkspaceFileProxyUrl = (fileId: string) =>
  `${BASE_URL}/workspace/file/${fileId}/proxy`;

/** Update file metadata */
export const updateWorkspaceFileMeta = async (
  fileId: string,
  data: { name?: string; workspace?: string; tags?: string; description?: string }
) => {
  const res = await fetch(`${BASE_URL}/workspace/file/${fileId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

// ─── Meet Logs ────────────────────────────────────────────────────────────────

export const fetchCallLogs = async () => {
  const res = await fetch(`${BASE_URL}/meet/logs`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const saveCallLog = async (data: {
  roomId: string;
  type: 'voice' | 'video';
  label?: string;
  duration?: number;
  missed?: boolean;
}) => {
  const res = await fetch(`${BASE_URL}/meet/logs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const clearCallLogs = async () => {
  const res = await fetch(`${BASE_URL}/meet/logs`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Feed / Blog ──────────────────────────────────────────────────────────────

export const fetchFeedPosts = async (page = 1, limit = 20) => {
  const res = await fetch(`${BASE_URL}/feed?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const createFeedPost = async (content: string, file?: File) => {
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  formData.append('content', content);
  if (file) formData.append('file', file);

  const res = await fetch(`${BASE_URL}/feed`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse(res);
};

export const likeFeedPost = async (postId: string) => {
  const res = await fetch(`${BASE_URL}/feed/${postId}/like`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const repostFeedPost = async (postId: string) => {
  const res = await fetch(`${BASE_URL}/feed/${postId}/repost`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const addFeedComment = async (postId: string, text: string) => {
  const res = await fetch(`${BASE_URL}/feed/${postId}/comment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
};

// ─── Community ────────────────────────────────────────────────────────────────

export const fetchCommunityCategories = async () => {
  const res = await fetch(`${BASE_URL}/community/categories`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const fetchTrendingNetworks = async () => {
  const res = await fetch(`${BASE_URL}/community/trending`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const fetchNetworkOfTheMonth = async () => {
  const res = await fetch(`${BASE_URL}/community/month`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const fetchNetworks = async (params?: { search?: string; category?: string; page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.category) q.set('category', params.category);
  if (params?.page) q.set('page', params.page.toString());
  if (params?.limit) q.set('limit', params.limit.toString());

  const res = await fetch(`${BASE_URL}/community/networks?${q.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const fetchNetworkById = async (id: string) => {
  const res = await fetch(`${BASE_URL}/community/networks/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const createNetwork = async (data: any) => {
  const res = await fetch(`${BASE_URL}/community/networks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const joinNetwork = async (id: string) => {
  const res = await fetch(`${BASE_URL}/community/networks/${id}/join`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const leaveNetwork = async (id: string) => {
  const res = await fetch(`${BASE_URL}/community/networks/${id}/leave`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const fetchNetworkPosts = async (id: string) => {
  const res = await fetch(`${BASE_URL}/community/networks/${id}/posts`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const createNetworkPost = async (id: string, data: any) => {
  const res = await fetch(`${BASE_URL}/community/networks/${id}/posts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const reactToNetworkPost = async (networkId: string, postId: string, emoji: string) => {
  const res = await fetch(`${BASE_URL}/community/networks/${networkId}/posts/${postId}/react`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ emoji }),
  });
  return handleResponse(res);
};

export const forwardNetworkPost = async (networkId: string, postId: string, targetNetworkId?: string) => {
  const res = await fetch(`${BASE_URL}/community/networks/${networkId}/posts/${postId}/forward`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ targetNetworkId }),
  });
  return handleResponse(res);
};

// ─── Saved Posts ──────────────────────────────────────────────────────────────

/** Toggle save/unsave a feed post */
export const saveFeedPost = async (postId: string) => {
  const res = await fetch(`${BASE_URL}/feed/${postId}/save`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Fetch all posts saved by the current user */
export const fetchSavedPosts = async () => {
  const res = await fetch(`${BASE_URL}/feed/saved`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};
// ─── Aida AI ──────────────────────────────────────────────────────────────────

/** Send a message to Aida and get a response from Gemma */
export const chatWithAida = async (message: string) => {
  const res = await fetch(`${BASE_URL}/aida/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });
  return handleResponse(res);
};

/** Get a context-aware daily briefing from Aida */
export const fetchAidaBriefing = async () => {
  const res = await fetch(`${BASE_URL}/aida/daily-briefing`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

/** Get financial advice from Aida based on recent transactions */
export const fetchAidaFinanceAdvice = async () => {
  const res = await fetch(`${BASE_URL}/aida/financial-advice`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Aida Agentic Actions ─────────────────────────────────────────────────────

export const aidaExtractActionItems = async (transcript: string, attendeeNames?: string[]) => {
  const res = await fetch(`${BASE_URL}/aida/extract-action-items`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ transcript, attendeeNames }),
  });
  return handleResponse(res);
};

export const aidaSearchWorkspace = async (query: string) => {
  const res = await fetch(`${BASE_URL}/aida/search-workspace`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ query }),
  });
  return handleResponse(res);
};

export const aidaScheduleSuggestion = async (duration = 30, preferredDay?: string) => {
  const res = await fetch(`${BASE_URL}/aida/schedule-suggestion`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ duration, preferredDay }),
  });
  return handleResponse(res);
};

export const aidaSummarizeFeed = async () => {
  const res = await fetch(`${BASE_URL}/aida/summarize-feed`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const aidaFlagPayments = async () => {
  const res = await fetch(`${BASE_URL}/aida/flag-payments`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const fetchNotifications = async (page = 1, limit = 30) => {
  const res = await fetch(`${BASE_URL}/notifications?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const fetchUnreadCount = async () => {
  const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const markNotificationRead = async (id: string) => {
  const res = await fetch(`${BASE_URL}/notifications/${id}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const markAllNotificationsRead = async () => {
  const res = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const deleteNotification = async (id: string) => {
  const res = await fetch(`${BASE_URL}/notifications/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const clearAllNotifications = async () => {
  const res = await fetch(`${BASE_URL}/notifications`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Meetings ─────────────────────────────────────────────────────────────────

export const createMeeting = async (data: {
  roomId?: string;
  title?: string;
  type?: 'video' | 'voice' | 'group';
  attendees?: string[];
  attendeeNames?: string[];
}) => {
  const res = await fetch(`${BASE_URL}/meetings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const fetchMeetings = async (page = 1, limit = 20) => {
  const res = await fetch(`${BASE_URL}/meetings?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const fetchMeetingById = async (id: string) => {
  const res = await fetch(`${BASE_URL}/meetings/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const addMeetingTranscriptChunk = async (
  meetingId: string,
  chunk: { speaker?: string; text: string; timestamp?: number }
) => {
  const res = await fetch(`${BASE_URL}/meetings/${meetingId}/transcript`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(chunk),
  });
  return handleResponse(res);
};

export const endMeeting = async (meetingId: string, transcriptRaw?: string) => {
  const res = await fetch(`${BASE_URL}/meetings/${meetingId}/end`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ transcriptRaw }),
  });
  return handleResponse(res);
};

export const fetchMeetingActionItems = async (meetingId: string) => {
  const res = await fetch(`${BASE_URL}/meetings/${meetingId}/action-items`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const fetchTemplates = async (type?: 'meeting' | 'document' | 'task') => {
  const q = type ? `?type=${type}` : '';
  const res = await fetch(`${BASE_URL}/templates${q}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const createTemplate = async (data: {
  type: 'meeting' | 'document' | 'task';
  title: string;
  description?: string;
  content?: Record<string, any>;
  tags?: string[];
}) => {
  const res = await fetch(`${BASE_URL}/templates`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const updateTemplate = async (id: string, data: any) => {
  const res = await fetch(`${BASE_URL}/templates/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const useTemplate = async (id: string) => {
  const res = await fetch(`${BASE_URL}/templates/${id}/use`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const deleteTemplate = async (id: string) => {
  const res = await fetch(`${BASE_URL}/templates/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Activity Log ─────────────────────────────────────────────────────────────

export const fetchActivityLog = async (params?: { page?: number; limit?: number; action?: string; entityType?: string }) => {
  const q = new URLSearchParams();
  if (params?.page)       q.set('page',       params.page.toString());
  if (params?.limit)      q.set('limit',      params.limit.toString());
  if (params?.action)     q.set('action',     params.action);
  if (params?.entityType) q.set('entityType', params.entityType);

  const res = await fetch(`${BASE_URL}/activity?${q.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const clearActivityLog = async () => {
  const res = await fetch(`${BASE_URL}/activity`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const createInvoice = async (data: {
  recipientName?: string;
  recipientEmail?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  tax?: number;
  discount?: number;
  currency?: string;
  dueDate?: string;
  notes?: string;
}) => {
  const res = await fetch(`${BASE_URL}/payment/invoice`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const fetchInvoices = async (status?: string) => {
  const q = status ? `?status=${status}` : '';
  const res = await fetch(`${BASE_URL}/payment/invoices${q}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const fetchInvoiceById = async (id: string) => {
  const res = await fetch(`${BASE_URL}/payment/invoice/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const updateInvoice = async (id: string, data: { status?: string; dueDate?: string; notes?: string; recipientEmail?: string }) => {
  const res = await fetch(`${BASE_URL}/payment/invoice/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const deleteInvoice = async (id: string) => {
  const res = await fetch(`${BASE_URL}/payment/invoice/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

// ─── Extended Tasks ───────────────────────────────────────────────────────────

export const createTaskFull = async (data: {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  type?: 'event' | 'task' | 'synced';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  color?: string;
  source?: string;
  isRecurring?: boolean;
  recurrence?: 'daily' | 'weekly' | 'monthly';
}) => {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const fetchTasks = async (params?: {
  type?: string;
  status?: string;
  source?: string;
  from?: string;
  to?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.type)   q.set('type',   params.type);
  if (params?.status) q.set('status', params.status);
  if (params?.source) q.set('source', params.source);
  if (params?.from)   q.set('from',   params.from);
  if (params?.to)     q.set('to',     params.to);

  const res = await fetch(`${BASE_URL}/tasks?${q.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const snoozeTask = async (id: string, snoozedUntil: string) => {
  const res = await fetch(`${BASE_URL}/tasks/${id}/snooze`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ snoozedUntil }),
  });
  return handleResponse(res);
};

