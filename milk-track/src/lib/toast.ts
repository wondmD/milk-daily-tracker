import { toast } from 'react-hot-toast';

const baseStyle = {
  background: '#FFFFFF',
  color: '#1C2521',
  border: '1px solid #E2E3DC',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  fontWeight: 500,
  fontSize: '14px',
  borderRadius: '10px',
  padding: '12px 16px',
};

export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 4000,
    style: baseStyle,
    iconTheme: {
      primary: '#2F7D5C',
      secondary: '#E7F3ED',
    },
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: 5000,
    style: baseStyle,
    iconTheme: {
      primary: '#B65345',
      secondary: '#FDF0EE',
    },
  });
};

export const showWarning = (message: string) => {
  toast(message, {
    duration: 4000,
    icon: '⚠️',
    style: baseStyle,
  });
};

export const showInfo = (message: string) => {
  toast(message, {
    duration: 3000,
    icon: 'ℹ️',
    style: baseStyle,
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    style: baseStyle,
  });
};

export const dismissToast = (toastId?: string) => {
  toast.dismiss(toastId);
};
