import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-functions.js";

// Firebase web config identifies the project; enforce domain restrictions and App Check in Firebase Console.
export const firebaseConfig = {
  apiKey: "AIzaSyBC24g6jviipUviY9xSh_K0aXyJotHhiVw",
  authDomain: "zivo-shophelper.firebaseapp.com",
  projectId: "zivo-shophelper",
  storageBucket: "zivo-shophelper.firebasestorage.app",
  messagingSenderId: "247526924763",
  appId: "1:247526924763:web:78dd4a26ad01761a4bc7fe",
  measurementId: "G-H83N3MZ8F0"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "asia-south1");
let activeShopId = null;
let activeMember = null;

async function resolveMembership(user) {
  const memberships = await getDocs(query(collection(db, "userShops", user.uid, "memberships"), where("status", "==", "active")));
  if (memberships.empty) throw new Error("No active shop membership found for this account. Ask your shop owner for an invitation.");
  const membership = memberships.docs[0];
  activeShopId = membership.id;
  activeMember = membership.data();
  const profileSnap = await getDoc(doc(db, "users", user.uid));
  const profile = profileSnap.exists() ? profileSnap.data() : { email: user.email, userName: user.displayName || "User" };
  const shopSnap = await getDoc(doc(db, "shops", activeShopId));
  if (!shopSnap.exists()) throw new Error("Your shop workspace no longer exists.");
  return { shopId: activeShopId, profile: { ...profile, email: user.email, shopName: shopSnap.data().name, role: activeMember.role, permissions: activeMember.permissions || {} } };
}

export async function createShop({userName,email,password,shopName,age}) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: userName });
  const shopRef = doc(collection(db, "shops"));
  const membership = { uid: cred.user.uid, email, displayName: userName, role: "owner", status: "active", permissions: { all: true }, createdAt: serverTimestamp() };
  await setDoc(doc(db,"users",cred.user.uid), { displayName:userName, email, age, createdAt:serverTimestamp() });
  await setDoc(shopRef, { name:shopName, ownerUid:cred.user.uid, createdAt:serverTimestamp(), status:"active", schemaVersion:1 });
  await setDoc(doc(db,"shops",shopRef.id,"members",cred.user.uid), membership);
  await setDoc(doc(db,"userShops",cred.user.uid,"memberships",shopRef.id), { shopId:shopRef.id, role:"owner", status:"active", createdAt:serverTimestamp() });
  activeShopId = shopRef.id; activeMember = membership;
  return { shopId:shopRef.id };
}

export async function signIn(email,password) {
  const cred = await signInWithEmailAndPassword(auth,email,password);
  return resolveMembership(cred.user);
}

export async function loadShopData() {
  if (!activeShopId) throw new Error("No shop selected");
  const snap = await getDoc(doc(db,"shops",activeShopId,"data","main"));
  return snap.exists() ? snap.data() : null;
}
export async function saveShopData(payload) {
  if (!activeShopId || !auth.currentUser) throw new Error("Sign in before saving");
  await setDoc(doc(db,"shops",activeShopId,"data","main"), { ...payload, updatedAt:serverTimestamp(), updatedBy:auth.currentUser.uid }, {merge:true});
}
export async function inviteStaff(email, permissions={}) {
  const callable = httpsCallable(functions,"inviteStaff");
  return (await callable({shopId:activeShopId,email,permissions})).data;
}
export async function updateStaff(memberUid, permissions, status="active") {
  const callable = httpsCallable(functions,"updateStaff");
  return (await callable({shopId:activeShopId,memberUid,permissions,status})).data;
}
window.__zivoCloud = { createShop, signIn, loadShopData, saveShopData, inviteStaff, updateStaff, signOut:()=>signOut(auth), get shopId(){return activeShopId;}, get member(){return activeMember;} };
