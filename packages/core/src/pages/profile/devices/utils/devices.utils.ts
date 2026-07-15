import {
  IconBrandAndroid,
  IconBrandAppleFilled,
  IconBrandWindows,
  IconDeviceImacFilled,
  IconDeviceMobile,
} from '@tabler/icons-react';

export function extractAppName(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const firstToken = userAgent.split('/')[0].split(' ')[0].trim();
  return firstToken || null;
}

export function resolveDeviceIcon(device: string | null) {
  if (!device) return IconDeviceMobile;
  const value = device.toLowerCase();
  if (value.includes('mac')) return IconDeviceImacFilled;
  if (value.includes('iphone')) return IconDeviceMobile;
  if (value.includes('ios')) return IconBrandAppleFilled;
  if (value.includes('android')) return IconBrandAndroid;
  if (value.includes('windows')) return IconBrandWindows;
  return IconDeviceMobile;
}
