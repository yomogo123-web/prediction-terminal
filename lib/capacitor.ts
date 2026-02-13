import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function hapticLight(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function hapticMedium(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function hapticHeavy(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {}
}

export async function hapticNotification(type: 'success' | 'warning' | 'error'): Promise<void> {
  if (!isNative()) return;
  const map: Record<string, NotificationType> = {
    success: NotificationType.Success,
    warning: NotificationType.Warning,
    error: NotificationType.Error,
  };
  try {
    await Haptics.notification({ type: map[type] });
  } catch {}
}
