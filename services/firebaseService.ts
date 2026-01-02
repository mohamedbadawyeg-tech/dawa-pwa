
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  serverTimestamp
} from "firebase/firestore";
import { 
  getMessaging, 
  getToken, 
  onMessage 
} from "firebase/messaging";
import { AppState } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyCbjITpAZBfA-NItVOX6Hc3AJlet6EKk7E",
  authDomain: "eladwya-92754604-eb321.firebaseapp.com",
  projectId: "eladwya-92754604-eb321",
  storageBucket: "eladwya-92754604-eb321.firebasestorage.app",
  messagingSenderId: "319834803886",
  appId: "1:319834803886:web:6a71f628e1a20d01c5a73f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

let messaging: any = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("Firebase Messaging initialization skipped:", e);
}

export const requestForToken = async () => {
  if (!messaging) {
    console.error("Messaging is not initialized");
    throw new Error("Firebase Messaging not initialized (Browser may not support it).");
  }
  try {
    console.log("Waiting for SW ready...");
    
    // Explicitly wait for SW controller
    if (!navigator.serviceWorker.controller) {
       console.log("No controller found, waiting for registration...");
    }

    const registration = await navigator.serviceWorker.ready;
    console.log("SW Ready:", registration);

    if (!registration) {
       throw new Error("No service worker registration found after waiting.");
    }

    console.log("Requesting token...");
    const currentToken = await getToken(messaging, { 
      vapidKey: 'BN5rkFKkzuPxT7mGCq0hkUnEyODvdxuT6TI5ML33etf_SwaExFlyS5_sHNuIf0iEC-Z5B63QjPuTUusMQfjMykA',
      serviceWorkerRegistration: registration
    });
    
    console.log("Token result:", currentToken);
    
    if (currentToken) {
      return currentToken;
    }
    throw new Error('No registration token available.');
  } catch (err: any) {
    console.error('An error occurred while retrieving token:', err);
    throw err; 
  }
};

export const saveTokenToDatabase = async (patientId: string, token: string) => {
  if (!patientId || !token) return;
  const tokenRef = doc(db, "tokens", patientId);
  try {
    await setDoc(tokenRef, { 
      fcmToken: token, 
      lastUpdated: serverTimestamp(),
      platform: 'web-pwa'
    }, { merge: true });
    console.log("Token saved to database for patient:", patientId);
  } catch (error) {
    console.error("Error saving token to Firestore:", error);
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground: ', payload);
    callback(payload);
  });
};

export const syncPatientData = async (patientId: string, data: AppState) => {
  if (!patientId || patientId.length < 4) return;
  const docRef = doc(db, "patients", patientId);
  try {
    const syncPayload = {
      patientName: data.patientName,
      medications: data.medications || [],
      takenMedications: data.takenMedications || {},
      currentReport: data.currentReport,
      lastDailyTipDate: data.lastDailyTipDate || "",
      dailyTipContent: data.dailyTipContent || "",
      lastUpdated: serverTimestamp()
    };
    await setDoc(docRef, syncPayload, { merge: true });
  } catch (error) {
    console.error("Firestore Sync Error:", error);
  }
};

export const listenToPatient = (patientId: string, onUpdate: (data: any) => void) => {
  if (!patientId || patientId.length < 4) return () => {};
  const docRef = doc(db, "patients", patientId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) onUpdate(docSnap.data());
  });
};

export const sendRemoteReminder = async (patientId: string, medName: string) => {
  if (!patientId) return;
  const docRef = doc(db, "patients", patientId);
  try {
    await setDoc(docRef, {
      remoteReminder: {
        timestamp: Date.now(),
        medName: medName
      }
    }, { merge: true });

    // Trigger GitHub Action for background notification
    const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN; // Needs to be set in .env
    const GITHUB_OWNER = "mohamedbadawyeg-tech";
    const GITHUB_REPO = "dawa-pwa";

    if (GITHUB_TOKEN) {
        await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                event_type: 'caregiver_reminder',
                client_payload: {
                    patientId: patientId,
                    medName: medName
                }
            })
        });
    }

  } catch (error) {
    console.error("Error sending remote reminder:", error);
    throw error;
  }
};

export const generateSyncId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
