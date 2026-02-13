import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function initPushNotifications(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== 'granted') return null;
  } else if (permStatus.receive !== 'granted') {
    return null;
  }

  await PushNotifications.register();

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      console.log('[Push] Registered with token:', token.value);
      // TODO: Send token to backend via /api/push/register
      // fetch('/api/push/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
      // });
      resolve(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration failed:', err);
      resolve(null);
    });
  });
}

export function setupPushListeners(): void {
  if (!Capacitor.isNativePlatform()) return;

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Foreground notification:', notification);
    // TODO: Show in-app toast or update alert state
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[Push] Notification action:', action);
    // TODO: Navigate to relevant market based on action.notification.data
  });
}
