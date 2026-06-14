import { PushToken } from '../models/pushToken';

/**
 * Sends push notifications to a list of users using the Expo Push API.
 * 
 * @param userIds Array of MongoDB User IDs (string or ObjectId)
 * @param title Notification Title
 * @param body Notification Body/Content
 * @param data Optional extra key-value pairs to pass along
 */
export const sendPushNotification = async (
  userIds: (string | any)[],
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  try {
    if (!userIds || userIds.length === 0) return;

    // Standardize IDs to strings
    const strUserIds = userIds.map(id => String(id));

    // Retrieve active push tokens for target users
    const pushTokens = await PushToken.find({ userId: { $in: strUserIds } });
    if (pushTokens.length === 0) {
      console.log(`[Push] No push tokens registered for user(s): ${strUserIds.join(', ')}`);
      return;
    }

    // Build Expo message payload
    const messages = pushTokens.map(pt => ({
      to: pt.token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    console.log(`[Push] Dispatching ${messages.length} push notification(s) to Expo...`);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Push] Expo returned status ${response.status}: ${errText}`);
      return;
    }

    const result = await response.json();
    console.log('[Push] Notification dispatch response:', JSON.stringify(result));
  } catch (error) {
    console.error('[Push] Failed to send push notification:', error);
  }
};
