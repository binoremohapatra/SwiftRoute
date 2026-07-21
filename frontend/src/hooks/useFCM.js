import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export default function useFCM() {
  const { token, user } = useAuth();
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    if (!messaging || !token || !user) return;

    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const currentToken = await getToken(messaging, { 
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
          });
          
          if (currentToken) {
            setFcmToken(currentToken);
            // Send token to backend
            await fetch('https://swiftroute-17uj.onrender.com/api/v1/fcm/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                fcmToken: currentToken,
                deviceType: 'web'
              })
            });
          }
        }
      } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
      }
    };

    requestPermissionAndGetToken();

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      // Here you could use a toast library like react-hot-toast or similar to show the notification.
      // Since it's a foreground notification, the browser doesn't natively show a popup by default.
      // E.g., toast(payload.notification.title);
      
      // We will rely on our Socket.IO notifications for UI, but this proves FCM foreground works.
      if (Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/vite.svg',
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [token, user]);

  return { fcmToken };
}
