import { getDb } from "../db/firebase.js";
const coupons = () => getDb().collection("coupons");
const defaults = [{ id:"welcome10", code:"WELCOME10", discountPercent:10, active:true }, { id:"style20", code:"STYLE20", discountPercent:20, active:true }];
const getAll = async () => { const snapshot=await coupons().get(); return snapshot.empty ? defaults : snapshot.docs.map((doc)=>({id:doc.id,...doc.data()})); };
const findByCode = async (code) => (await getAll()).find((coupon)=>coupon.code === String(code).trim().toUpperCase() && coupon.active !== false);
const create = async (data) => { const item={code:String(data.code).trim().toUpperCase(),discountPercent:Number(data.discountPercent),active:data.active!==false,createdAt:new Date().toISOString()}; const doc=await coupons().add(item); return {id:doc.id,...item}; };
const remove = async (id) => { await coupons().doc(id).delete(); return id; };
export const Coupon={getAll,findByCode,create,remove};
