export const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || window?.location?.origin || 'http://localhost:5173';

export const isPublicAppUrl = () => window.location.origin === PUBLIC_APP_URL;

export const toPublicUrl = (path = "/") => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_APP_URL}${cleanPath}`;
};
