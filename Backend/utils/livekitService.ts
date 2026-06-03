import { AccessToken } from 'livekit-server-sdk';

export const generateLiveKitToken = async (
  roomName: string,
  participantName: string,
  identity: string
): Promise<string> => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials are not configured in environment variables');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return at.toJwt();
};
