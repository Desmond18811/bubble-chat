/**
 * Centralized API utility for interacting with the Bubble Chat Backend.
 */

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.replace(/ i$/, '')?.trim()) || 'https://bubble-backend-production-96a0.up.railway.app/api/v1';

import AsyncStorage from '@react-native-async-storage/async-storage';

const inMemoryStorage: Record<string, string> = {};

export const appStorage = {
    getItem: (key: string) => {
        return inMemoryStorage[key] || null;
    },
    setItem: (key: string, value: string) => {
        inMemoryStorage[key] = value;
        AsyncStorage.setItem(key, value).catch(err => console.error('AsyncStorage setItem error:', err));
    },
    removeItem: (key: string) => {
        delete inMemoryStorage[key];
        AsyncStorage.removeItem(key).catch(err => console.error('AsyncStorage removeItem error:', err));
    }
};

export const initAuthStorage = async () => {
    try {
        const keys = ['access_token', 'refresh_token', 'user_data'];
        for (const key of keys) {
            const val = await AsyncStorage.getItem(key);
            if (val) {
                inMemoryStorage[key] = val;
            }
        }
    } catch (e) {
        console.error('Failed to initialize persistent auth storage:', e);
    }
};

export const getAuthHeaders = () => {
    const token = appStorage.getItem('access_token');
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
    // 204 No Content — nothing to parse
    if (res.status === 204) return null;
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

export const refreshToken = async (rToken: string) => {
    const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rToken }),
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

export const joinOrganizationByInvite = async (inviteCode: string) => {
    const res = await fetch(`${BASE_URL}/org/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ inviteCode }),
    });
    return handleResponse(res);
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const searchUsers = async (query: string) => {
    const res = await fetch(
        `${BASE_URL}/user/search?search=${encodeURIComponent(query)}`,
        { headers: getAuthHeaders() }
    );
    const data = await handleResponse(res);
    const users = data.users || data.data || data.results || [];
    return { users };
};

export const getUserProfile = async (userId: string) => {
    const res = await fetch(`${BASE_URL}/user/${userId}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const getContacts = async (searchQuery = '') => {
    const res = await fetch(
        `${BASE_URL}/user/contacts?search=${encodeURIComponent(searchQuery)}`,
        { headers: getAuthHeaders() }
    );
    return handleResponse(res);
};

export const getMyContacts = async () => {
    const res = await fetch(`${BASE_URL}/user/contacts/my`, {
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

export const updatePrivacy = async (privacySettings: any) => {
    const res = await fetch(`${BASE_URL}/profile/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ privacy_settings: privacySettings }),
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
    const res = await fetch(`${BASE_URL}/chat`, { headers: getAuthHeaders() });
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

export const joinGroupChat = async (inviteCode: string) => {
    const res = await fetch(`${BASE_URL}/chat/group/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ inviteCode }),
    });
    return handleResponse(res);
};

export const updateGroupChat = async (
    chatId: string,
    data: {
        chatName?: string;
        groupIcon?: string;
        groupDescription?: string;
    }
) => {
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
    opts?: {
        parent_message?: string;
        mentions?: string[];
        is_forwarded?: boolean;
    }
) => {
    const res = await fetch(`${BASE_URL}/message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ chatId, content, message_type: 'text', ...opts }),
    });
    return handleResponse(res);
};

export const sendMediaMessage = async (
    chatId: string,
    file: File,
    opts?: {
        content?: string;
        parent_message?: string;
        message_type?: string;
        media_duration?: number;
    }
) => {
    const token = appStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('chatId', chatId);
    if (opts?.content) formData.append('content', opts.content);
    if (opts?.parent_message)
        formData.append('parent_message', opts.parent_message);
    if (opts?.media_duration !== undefined)
        formData.append('media_duration', opts.media_duration.toString());

    const resolvedType =
        opts?.message_type ||
        (file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
                ? 'video'
                : file.type.startsWith('audio/')
                    ? 'voice'
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

export const updateMessage = async (messageId: string, content: string) => {
    const res = await fetch(`${BASE_URL}/message/${messageId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
    });
    return handleResponse(res);
};

export const deleteMessageForMe = async (messageId: string) => {
    const res = await fetch(`${BASE_URL}/message/${messageId}/for-me`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const deleteMessageForEveryone = async (messageId: string) => {
    const res = await fetch(`${BASE_URL}/message/${messageId}/for-everyone`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const markMessagesRead = async (chatId: string) => {
    const res = await fetch(`${BASE_URL}/message/read/${chatId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const reactToMessage = async (messageId: string, emoji: string) => {
    const res = await fetch(`${BASE_URL}/message/${messageId}/react`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ emoji }),
    });
    return handleResponse(res);
};

export const blockUser = async (userId: string) => {
    const res = await fetch(`${BASE_URL}/user/block/${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const reportUser = async (userId: string, reason: string) => {
    const res = await fetch(`${BASE_URL}/user/report/${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
};

export const muteChat = async (chatId: string) => {
    const res = await fetch(`${BASE_URL}/chat/mute/${chatId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const clearChat = async (chatId: string) => {
    const res = await fetch(`${BASE_URL}/chat/clear/${chatId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const toggleChatPin = async (chatId: string) => {
    const res = await fetch(`${BASE_URL}/chat/pin/${chatId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const toggleMessagePin = async (messageId: string) => {
    const res = await fetch(`${BASE_URL}/message/${messageId}/pin`, {
        method: 'PUT',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const deleteChat = async (chatId: string) => {
    const res = await fetch(`${BASE_URL}/chat/${chatId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const removeContact = async (userId: string) => {
    const res = await fetch(`${BASE_URL}/user/contacts/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const getSuggestions = async () => {
    const res = await fetch(`${BASE_URL}/user/suggestions`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const getUnreadChatCount = async () => {
    const res = await fetch(`${BASE_URL}/chat/unread-count`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const toggleArchiveChat = async (chatId: string) => {
    const res = await fetch(`${BASE_URL}/chat/toggle-archive/${chatId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const getAidaWritingSuggestions = async (message: string, conversationId: string) => {
    const res = await fetch(`${BASE_URL}/aida/writing-suggestions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, conversationId }),
    });
    return handleResponse(res);
};

// ─── Stories ──────────────────────────────────────────────────────────────────

export const fetchStories = async () => {
    const res = await fetch(`${BASE_URL}/story`, { headers: getAuthHeaders() });
    return handleResponse(res);
};

export const uploadStory = async (
    file: File | undefined | null,
    textContent?: string,
    opts?: { bg_gradient?: string; text_color?: string }
) => {
    const token = appStorage.getItem('access_token');
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

export const uploadPublicKey = async (publicKey: string) => {
    const res = await fetch(`${BASE_URL}/user/public-key`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ publicKey }),
    });
    return handleResponse(res);
};

export const getPublicKey = async (userId: string) => {
    const res = await fetch(`${BASE_URL}/user/${userId}/public-key`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};



// ─── Workspace Files ──────────────────────────────────────────────────────────

export const uploadWorkspaceFile = async (
    file: File | null,
    opts?: {
        name?: string;
        workspace?: string;
        source?: string;
        sourceReference?: string;
        tags?: string;
        description?: string;
        linkUrl?: string;
    }
) => {
    const token = appStorage.getItem('access_token');
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (opts?.linkUrl) formData.append('linkUrl', opts.linkUrl);
    if (opts?.name) formData.append('name', opts.name);
    if (opts?.workspace) formData.append('workspace', opts.workspace);
    if (opts?.source) formData.append('source', opts.source);
    if (opts?.sourceReference)
        formData.append('sourceReference', opts.sourceReference);
    if (opts?.tags) formData.append('tags', opts.tags);
    if (opts?.description) formData.append('description', opts.description);
    const res = await fetch(`${BASE_URL}/workspace/file`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    return handleResponse(res);
};

export const createWorkspaceFolder = async (
    name: string,
    workspace?: string
) => {
    const res = await fetch(`${BASE_URL}/workspace/folder`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, workspace }),
    });
    return handleResponse(res);
};

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

export const getSharedWorkspaceFolder = async (folderId: string) => {
    const res = await fetch(`${BASE_URL}/workspace/shared/${folderId}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const deleteWorkspaceFile = async (fileId: string) => {
    const res = await fetch(`${BASE_URL}/workspace/file/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const shareWorkspaceFile = async (chatId: string, fileId: string) => {
    const res = await fetch(`${BASE_URL}/message/share-workspace-file`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ chatId, fileId }),
    });
    return handleResponse(res);
};

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

export const getWorkspaceFileProxyUrl = (fileId: string) =>
    `${BASE_URL}/workspace/file/${fileId}/proxy`;

export const updateWorkspaceFileMeta = async (
    fileId: string,
    data: {
        name?: string;
        workspace?: string;
        tags?: string;
        description?: string;
    }
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

export const deleteCallLog = async (id: string) => {
    const res = await fetch(`${BASE_URL}/meet/logs/${id}`, {
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

export const getTrendingFeedPosts = async (page = 1, limit = 20) => {
    const res = await fetch(
        `${BASE_URL}/feed/trending?page=${page}&limit=${limit}`,
        { headers: getAuthHeaders() }
    );
    return handleResponse(res);
};

export const getFollowingFeedPosts = async (page = 1, limit = 20) => {
    const res = await fetch(
        `${BASE_URL}/feed/following?page=${page}&limit=${limit}`,
        { headers: getAuthHeaders() }
    );
    return handleResponse(res);
};

export const createFeedPost = async (content: string, file?: File) => {
    const token = appStorage.getItem('access_token');
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

export const fetchNetworks = async (params?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
}) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    const res = await fetch(
        `${BASE_URL}/community/networks?${q.toString()}`,
        { headers: getAuthHeaders() }
    );
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
    const res = await fetch(
        `${BASE_URL}/community/networks/${id}/posts`,
        { headers: getAuthHeaders() }
    );
    return handleResponse(res);
};

export const createNetworkPost = async (id: string, data: any) => {
    const res = await fetch(
        `${BASE_URL}/community/networks/${id}/posts`,
        {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        }
    );
    return handleResponse(res);
};

export const reactToNetworkPost = async (
    networkId: string,
    postId: string,
    emoji: string
) => {
    const res = await fetch(
        `${BASE_URL}/community/networks/${networkId}/posts/${postId}/react`,
        {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ emoji }),
        }
    );
    return handleResponse(res);
};

export const forwardNetworkPost = async (
    networkId: string,
    postId: string,
    targetNetworkId?: string
) => {
    const res = await fetch(
        `${BASE_URL}/community/networks/${networkId}/posts/${postId}/forward`,
        {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ targetNetworkId }),
        }
    );
    return handleResponse(res);
};

export const deleteNetworkPost = async (networkId: string, postId: string) => {
    const res = await fetch(
        `${BASE_URL}/community/networks/${networkId}/posts/${postId}`,
        { method: 'DELETE', headers: getAuthHeaders() }
    );
    return handleResponse(res);
};

// ─── Saved Posts ──────────────────────────────────────────────────────────────

export const saveFeedPost = async (postId: string) => {
    const res = await fetch(`${BASE_URL}/feed/${postId}/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const fetchSavedPosts = async () => {
    const res = await fetch(`${BASE_URL}/feed/saved`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

// ─── Aida AI ──────────────────────────────────────────────────────────────────

export const fetchAidaConversationObj = async () => {
    const res = await fetch(`${BASE_URL}/aida/conversation`, { headers: getAuthHeaders() });
    return handleResponse(res);
};

export const chatMessageAida = async (message: string, conversationId?: string) => {
    const res = await fetch(`${BASE_URL}/aida/chat-message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, conversationId }),
    });
    return handleResponse(res);
};

export const fetchAidaConversationSummary = async (conversationId: string) => {
    const res = await fetch(`${BASE_URL}/aida/conversation-summary/${conversationId}`, { headers: getAuthHeaders() });
    return handleResponse(res);
};

export const fetchConversationContext = async (conversationId: string) => {
    const res = await fetch(`${BASE_URL}/aida/conversation-context/${conversationId}`, { headers: getAuthHeaders() });
    return handleResponse(res);
};

export const chatWithAida = async (message: string, history: any[] = []) => {
    const res = await fetch(`${BASE_URL}/aida/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, history }),
    });
    return handleResponse(res);
};

export const fetchAidaBriefing = async () => {
    const res = await fetch(`${BASE_URL}/aida/daily-briefing`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const fetchAidaFinanceAdvice = async () => {
    const res = await fetch(`${BASE_URL}/aida/financial-advice`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const aidaExtractActionItems = async (
    transcript: string,
    attendeeNames?: string[]
) => {
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

export const aidaScheduleSuggestion = async (
    duration = 30,
    preferredDay?: string
) => {
    const res = await fetch(`${BASE_URL}/aida/schedule-suggestion`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ duration, preferredDay }),
    });
    return handleResponse(res);
};

export const aidaScheduleTask = async (data: {
    title: string;
    startTime?: string;
    description?: string;
}) => {
    const res = await fetch(`${BASE_URL}/aida/schedule-task`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
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

// ─── Aida Org Knowledge Base (RAG Documents) ──────────────────────────────────

export const fetchOrgDocs = async (params?: { q?: string; department?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.department) q.set('department', params.department);
    if (params?.page) q.set('page', params.page.toString());
    const res = await fetch(`${BASE_URL}/aida/org-docs?${q.toString()}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const fetchOrgDoc = async (id: string) => {
    const res = await fetch(`${BASE_URL}/aida/org-docs/${id}`, { headers: getAuthHeaders() });
    return handleResponse(res);
};

export const createOrgDoc = async (data: {
    title: string;
    content: string;
    department?: string;
    accessLevel?: 'public' | 'restricted' | 'admin';
    tags?: string[];
}) => {
    const res = await fetch(`${BASE_URL}/aida/org-docs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
};

export const updateOrgDoc = async (id: string, data: Partial<{
    title: string;
    content: string;
    department: string;
    accessLevel: string;
    tags: string[];
}>) => {
    const res = await fetch(`${BASE_URL}/aida/org-docs/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
};

export const deleteOrgDoc = async (id: string) => {
    const res = await fetch(`${BASE_URL}/aida/org-docs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};



// ─── Notifications ────────────────────────────────────────────────────────────

export const fetchNotifications = async (page = 1, limit = 30) => {
    const res = await fetch(
        `${BASE_URL}/notifications?page=${page}&limit=${limit}`,
        { headers: getAuthHeaders() }
    );
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
    const res = await fetch(
        `${BASE_URL}/meetings?page=${page}&limit=${limit}`,
        { headers: getAuthHeaders() }
    );
    return handleResponse(res);
};

export const fetchMeetingById = async (id: string) => {
    const res = await fetch(`${BASE_URL}/meetings/${id}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

/**
 * Fire-and-forget transcript chunk — called in real-time from SpeechRecognition.
 * Uses meetingId (MongoDB _id) which is stored in the MeetRoom state after
 * createMeeting() is called at the start of the call.
 */
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

export const endMeeting = async (
    meetingId: string,
    options?: { transcriptRaw?: string; saveToStorage?: boolean; sendEmail?: boolean }
) => {
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(options || {}),
    });
    return handleResponse(res);
};

export const getMeetingStatsWithUser = async (withUserId: string) => {
    const res = await fetch(`${BASE_URL}/meetings/stats/${withUserId}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const fetchMeetingActionItems = async (meetingId: string) => {
    const res = await fetch(
        `${BASE_URL}/meetings/${meetingId}/action-items`,
        { headers: getAuthHeaders() }
    );
    return handleResponse(res);
};

// ── NEW: Meeting file sharing ─────────────────────────────────────────────────

/**
 * Log a file or link to the meeting's file list.
 * Call this AFTER the workspace upload succeeds to attach the record
 * to the meeting so it appears in the transcript drawer's Files tab.
 */
export const logMeetingFile = async (
    meetingId: string,
    data: {
        fileId?: string;
        name: string;
        fileType?: string;
        fileSize?: number;
        fileUrl?: string;
        linkUrl?: string;
        source?: 'file_upload' | 'tab_share' | 'screen_share';
    }
) => {
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/files`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
};

/** Fetch all files shared during a specific meeting. */
export const fetchMeetingFiles = async (meetingId: string) => {
    const res = await fetch(`${BASE_URL}/meetings/${meetingId}/files`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

// ── NEW: Screen / tab share session tracking ──────────────────────────────────

/**
 * Record the start of a screen / window / tab share.
 * Returns a sessionId to be used when the share ends.
 */
export const startMeetingScreenShare = async (
    meetingId: string,
    data: { shareType?: 'screen' | 'window' | 'tab'; label?: string }
) => {
    const res = await fetch(
        `${BASE_URL}/meetings/${meetingId}/screen-share/start`,
        {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        }
    );
    return handleResponse(res);
};

/**
 * Record the end of a screen / window / tab share session.
 * Persists duration automatically on the backend.
 */
export const endMeetingScreenShare = async (
    meetingId: string,
    sessionId: string
) => {
    const res = await fetch(
        `${BASE_URL}/meetings/${meetingId}/screen-share/${sessionId}/end`,
        {
            method: 'PATCH',
            headers: getAuthHeaders(),
        }
    );
    return handleResponse(res);
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const fetchTemplates = async (
    type?: 'meeting' | 'document' | 'task'
) => {
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

export const fetchActivityLog = async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
}) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.action) q.set('action', params.action);
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

export const updateInvoice = async (
    id: string,
    data: {
        status?: string;
        dueDate?: string;
        notes?: string;
        recipientEmail?: string;
    }
) => {
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
    type?: 'event' | 'task' | 'synced' | 'meeting';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    color?: string;
    source?: string;
    isRecurring?: boolean;
    recurrence?: 'daily' | 'weekly' | 'monthly';
    recipients?: string[];
}) => {
    const res = await fetch(`${BASE_URL}/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
};

export const updateTaskFull = async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
};

export const deleteTaskFull = async (id: string) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
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
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    if (params?.source) q.set('source', params.source);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
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

// ─── Feed: Trending Tags ──────────────────────────────────────────────────────

export const getTrendingTags = async () => {
    const res = await fetch(`${BASE_URL}/feed/trending`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

// ─── User: Follow / Suggestions ───────────────────────────────────────────────

export const followUser = async (userId: string) => {
    const res = await fetch(`${BASE_URL}/user/${userId}/follow`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const getSuggestedUsers = async () => {
    const res = await fetch(`${BASE_URL}/user/suggestions`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const getMyFollowers = async (userId: string) => {
    const res = await fetch(`${BASE_URL}/user/${userId}/followers`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const getMyFollowing = async (userId: string) => {
    const res = await fetch(`${BASE_URL}/user/${userId}/following`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

// ─── Profile: Avatar Upload ───────────────────────────────────────────────────

export const uploadAvatar = async (file: File) => {
    const token = appStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/profile/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    return handleResponse(res);
};

export const uploadBackground = async (file: File) => {
    const token = appStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/profile/background`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    return handleResponse(res);
};

// ─── Profile: Management ───────────────────────────────────────────────────────

export const getMyProfile = async () => {
    const res = await fetch(`${BASE_URL}/profile/me`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const updateProfile = async (data: any) => {
    const res = await fetch(`${BASE_URL}/profile/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
};

export const setupProfile = async (data: any) => {
    const res = await fetch(`${BASE_URL}/profile/setup`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
};

// ─── Workspace: Shared With Me ────────────────────────────────────────────────

export const getSharedWithMeFiles = async () => {
    const res = await fetch(`${BASE_URL}/workspace/shared-with-me`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

// ─── Messages: Unread Count ───────────────────────────────────────────────────

export const fetchUnreadMessageCount = async () => {
    const res = await fetch(`${BASE_URL}/chat/unread-count`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

// ─── Messages: Request System ─────────────────────────────────────────────────

export const sendMessageRequest = async (userId: string) => {
    const res = await fetch(`${BASE_URL}/message/request/${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const respondToMessageRequest = async (requestId: string, action: 'accept' | 'decline') => {
    const res = await fetch(`${BASE_URL}/message/request/${requestId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action }),
    });
    return handleResponse(res);
};

export const getLiveKitToken = async (roomId: string) => {
    const res = await fetch(`${BASE_URL}/meet/livekit-token?roomId=${encodeURIComponent(roomId)}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const onboardOrgBrain = async (description: string) => {
    const res = await fetch(`${BASE_URL}/org/brain/onboard`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ description }),
    });
    return handleResponse(res);
};

export const getOrgInviteCode = async () => {
    const res = await fetch(`${BASE_URL}/org/invite-code`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(res);
};

export const ingestOrgDocument = async (data: { title: string; content: string; department?: string; accessLevel?: string; tags?: string[] }) => {
    const res = await fetch(`${BASE_URL}/org/documents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res);
};

export const fetchAiDescription = async (prompt: string) => {
    const res = await fetch(`${BASE_URL}/tasks/ai-describe`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt }),
    });
    return handleResponse(res);
};