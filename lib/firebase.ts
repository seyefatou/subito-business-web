import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyAqgFzcoHBdfgc_YLRi3OGQrYIYWbLhQq0',
  authDomain: 'mysubitoclient.firebaseapp.com',
  projectId: 'mysubitoclient',
  storageBucket: 'mysubitoclient.firebasestorage.app',
  messagingSenderId: '535843022839',
  appId: '1:535843022839:web:0ad2745dd8847ba34430f2',
};

const VAPID_KEY =
  'BGEiBdkmeyRWFDG4_j6FlrffMFL8WPp29eoUz7v-5uFsxPaqAjixx3BN9yO710uJttSTjnwBTPk78ILPYAMBJUw';

const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

/**
 * Demande la permission, récupère le token FCM et l'envoie au backend.
 * Appeler après le login company.
 */
export async function registerPushNotifications(sendTokenToBackend: (fcmToken: string) => Promise<void>): Promise<string | null> {
  try {
    const m = getMessagingInstance();
    if (!m) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Permission refusée');
      return null;
    }

    // Enregistrer le service worker et attendre qu'il soit actif
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    console.log('[FCM] Service Worker actif');

    const token = await getToken(m, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[FCM] Token obtenu:', token.substring(0, 30) + '...');
      await sendTokenToBackend(token);
      console.log('[FCM] Token envoyé au backend');
    }

    return token;
  } catch (err) {
    console.error('[FCM] Erreur enregistrement:', err);
    return null;
  }
}

/**
 * Écoute les messages reçus quand l'onglet est actif (foreground).
 * Retourne une fonction pour se désabonner.
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const m = getMessagingInstance();
  if (!m) return null;
  return onMessage(m, callback);
}
