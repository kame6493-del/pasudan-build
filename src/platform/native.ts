import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const native = Capacitor.isNativePlatform();

export function tap() {
  if (native) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}
export function thud() {
  if (native) Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
}
export function cheer() {
  if (native) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}
