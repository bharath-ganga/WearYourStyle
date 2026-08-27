import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../config/apiConfig";
import { useAuth } from "../../context/AuthContext";

const Wrap = styled.section`
  margin:60px 0 20px; border-top:1px solid #dedbd3; padding-top:38px;
  .top { display:flex; justify-content:space-between; gap:20px; align-items:end; margin-bottom:22px; }
  .score { font-size:36px; font-weight:800; }
  form { display:grid; gap:12px; padding:20px; border:1px solid #dedbd3; border-radius:16px; margin-bottom:22px; }
  textarea,select { border:1px solid #c9c5bc; border-radius:10px; padding:11px; }
  textarea { min-height:90px; resize:vertical; }
  form button { justify-self:start; padding:10px 17px; border-radius:999px; background:#263333; color:#fff; font-weight:700; }
  .reviews { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
  article { border:1px solid #dedbd3; border-radius:14px; padding:18px; }
  article p { color:#616666; line-height:1.55; margin-top:8px; }
`;
const ProductReviews = ({ productId }) => {
  const { isAuthenticated } = useAuth();
  const [data,setData]=useState({reviews:[],average:0,count:0});
  const [rating,setRating]=useState(5); const [comment,setComment]=useState("");
  const load=async()=>{ try{ const res=await axios.get(`${API_BASE_URL}/api/reviews/${productId}`); setData(res.data.data); }catch{ setData({reviews:[],average:0,count:0}); } };
  useEffect(()=>{load();},[productId]);
  const submit=async(e)=>{e.preventDefault();try{const token=localStorage.getItem("accessToken");await axios.post(`${API_BASE_URL}/api/reviews/${productId}`,{rating,comment},{headers:{Authorization:`Bearer ${token}`}});setComment("");toast.success("Review saved");load();}catch(error){toast.error(error.response?.data?.message||"Could not save review");}};
  return <Wrap><div className="top"><div><h2>Customer reviews</h2><p>Verified account feedback from the WearYourStyle community.</p></div><div className="score">{data.count?data.average:"—"}<small>/5</small></div></div>
    {isAuthenticated?<form onSubmit={submit}><strong>Share your fit notes</strong><select aria-label="Rating" value={rating} onChange={(e)=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} stars</option>)}</select><textarea value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="How was the fit, fabric, and finish?" required minLength={5}/><button>Publish review</button></form>:<p style={{marginBottom:20}}><Link to="/sign_in">Sign in</Link> to leave a review.</p>}
    <div className="reviews">{data.reviews.map(review=><article key={review.id}><strong>{review.userName}</strong><span style={{float:"right",color:"#d45b3f"}}>{"★".repeat(review.rating)}</span><p>{review.comment}</p></article>)}{!data.reviews.length&&<p>No reviews yet. Be the first to add fit notes.</p>}</div>
  </Wrap>;
};
export default ProductReviews;
