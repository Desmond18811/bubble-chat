import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const _BASE_API = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || 'http://localhost:3000/api/v1';

export const getSecureMediaUrl = (url?: string | null, proxyType: 'message' | 'story' = 'message'): string | null => {
  if (!url) return null;
  // If it's a filebase S3 url, proxy it through our backend to get a presigned URL
  if (url.includes('filebase.com')) {
    const route = proxyType === 'story' ? 'story' : 'message';
    return `${_BASE_API}/${route}/media/proxy?url=${encodeURIComponent(url)}`;
  }
  // Ensure local relative URLs route to the backend server instead of Vite frontend
  if (!url.startsWith('http') && !url.startsWith('blob:') && !url.startsWith('data:')) {
    const backendRoot = _BASE_API.replace('/api/v1', '');
    return `${backendRoot}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};
