import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Since we are in the backend directory, let's load the Firebase creds
const serviceAccountPath = resolve('./src/config/wearyourstyle-ecc14-firebase-adminsdk-y94l4-8ea73623ea.json');

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkOrders() {
  const ordersRef = db.collection('orders');
  const snapshot = await ordersRef.orderBy('order_date', 'desc').limit(3).get();
  
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

checkOrders();
