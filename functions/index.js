const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
initializeApp();
const db=getFirestore();
async function ownerOrThrow(uid, shopId) {
  const snap=await db.doc(`shops/${shopId}/members/${uid}`).get();
  if(!snap.exists || snap.data().role!=="owner" || snap.data().status!=="active") throw new HttpsError("permission-denied","Only the shop owner can manage staff.");
}
exports.inviteStaff=onCall({region:"asia-south1"},async(req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Sign in required.");
  const {shopId,email,permissions={}}=req.data||{};
  if(typeof shopId!=="string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||"")) throw new HttpsError("invalid-argument","A valid shop and staff email are required.");
  await ownerOrThrow(req.auth.uid,shopId);
  let user; try { user=await getAuth().getUserByEmail(email); } catch(e) { if(e.code!=="auth/user-not-found") throw e; }
  if(!user) throw new HttpsError("failed-precondition","Staff member must create a Zivo account first, then the owner can invite them.");
  const batch=db.batch();
  const member={uid:user.uid,email:user.email,displayName:user.displayName||"Staff",role:"staff",status:"active",permissions,createdAt:FieldValue.serverTimestamp(),invitedBy:req.auth.uid};
  batch.set(db.doc(`shops/${shopId}/members/${user.uid}`),member);
  batch.set(db.doc(`userShops/${user.uid}/memberships/${shopId}`),{shopId,role:"staff",status:"active",createdAt:FieldValue.serverTimestamp()});
  batch.set(db.collection(`shops/${shopId}/auditLogs`).doc(),{action:"staff.invited",actorUid:req.auth.uid,targetUid:user.uid,createdAt:FieldValue.serverTimestamp()});
  await batch.commit(); return {ok:true,uid:user.uid};
});
exports.updateStaff=onCall({region:"asia-south1"},async(req)=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Sign in required.");
  const {shopId,memberUid,permissions,status="active"}=req.data||{};
  await ownerOrThrow(req.auth.uid,shopId);
  if(memberUid===req.auth.uid) throw new HttpsError("failed-precondition","Owner permissions cannot be changed here.");
  if(!["active","disabled"].includes(status)) throw new HttpsError("invalid-argument","Invalid member status.");
  const ref=db.doc(`shops/${shopId}/members/${memberUid}`), snap=await ref.get();
  if(!snap.exists || snap.data().role!=="staff") throw new HttpsError("not-found","Staff member not found.");
  const batch=db.batch(); batch.update(ref,{permissions:permissions||snap.data().permissions,status,updatedAt:FieldValue.serverTimestamp()});
  batch.update(db.doc(`userShops/${memberUid}/memberships/${shopId}`),{status,permissions:permissions||snap.data().permissions});
  batch.set(db.collection(`shops/${shopId}/auditLogs`).doc(),{action:status==="disabled"?"staff.disabled":"staff.updated",actorUid:req.auth.uid,targetUid:memberUid,createdAt:FieldValue.serverTimestamp()});
  await batch.commit(); return {ok:true};
});
