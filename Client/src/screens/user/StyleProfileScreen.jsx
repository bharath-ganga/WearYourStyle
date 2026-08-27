import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import styled from "styled-components";
import { Container } from "../../styles/styles";
import Breadcrumb from "../../components/common/Breadcrumb";
import UserMenu from "../../components/user/UserMenu";
import Title from "../../components/common/Title";
import { UserContent, UserDashboardWrapper } from "../../styles/user";
import { API_BASE_URL } from "../../config/apiConfig";
import { useAuth } from "../../context/AuthContext";

const Form = styled.form`
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; margin-top:22px;
  label { display:grid; gap:8px; font-weight:700; }
  input,select { border:1px solid #c9c5bc; border-radius:10px; padding:12px; background:#fff; }
  .wide { grid-column:1/-1; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; }
  .chips button { border:1px solid #c9c5bc; border-radius:999px; padding:9px 13px; }
  .chips button.active { background:#263333; color:#fff; border-color:#263333; }
  .save { grid-column:1/-1; justify-self:start; background:#d45b3f; color:#fff; border-radius:999px; padding:12px 22px; font-weight:800; }
  @media(max-width:700px){ grid-template-columns:1fr; .wide,.save{grid-column:auto;} }
`;

const options = ["Minimal", "Classic", "Streetwear", "Romantic", "Sporty", "Statement"];
const StyleProfileScreen = () => {
  const { user, refreshAuth } = useAuth();
  const [form, setForm] = useState({ firstName:"", lastName:"", phoneNumber:"", bodyType:"", preferredFit:"regular", favoriteColors:"", occasion:"Everyday", chest:"", waist:"", hips:"", height:"" });
  useEffect(() => setForm((current) => ({ ...current, firstName:user?.firstName || "", lastName:user?.lastName || "", phoneNumber:user?.phoneNumber || "", ...(user?.stylePreferences || {}), ...(user?.measurements || {}) })), [user]);
  const selected = form.styles || [];
  const toggleStyle = (style) => setForm((current) => ({ ...current, styles:selected.includes(style) ? selected.filter((item) => item !== style) : [...selected, style] }));
  const save = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("accessToken");
    const { chest, waist, hips, height, firstName, lastName, phoneNumber, ...stylePreferences } = form;
    await axios.patch(`${API_BASE_URL}/api/profile`, { firstName, lastName, phoneNumber, stylePreferences, measurements:{ chest, waist, hips, height } }, { headers:{ Authorization:`Bearer ${token}` } });
    await refreshAuth();
    toast.success("Fit and style profile saved");
  };
  return <main className="page-py-spacing"><Container><Breadcrumb items={[{label:"Home",link:"/"},{label:"Style profile",link:"/style-profile"}]} /><UserDashboardWrapper><UserMenu/><UserContent><Title titleText="Fit & style profile"/><p className="text-gray">Your answers improve size guidance and outfit recommendations. You can change them any time.</p><Form onSubmit={save}>
    <label>First name<input required value={form.firstName} onChange={(e)=>setForm({...form,firstName:e.target.value})}/></label><label>Last name<input required value={form.lastName} onChange={(e)=>setForm({...form,lastName:e.target.value})}/></label><label>Phone number<input required value={form.phoneNumber} onChange={(e)=>setForm({...form,phoneNumber:e.target.value})}/></label>
    <label>Body type<select value={form.bodyType} onChange={(e)=>setForm({...form,bodyType:e.target.value})}><option value="">Prefer not to say</option><option>Rectangle</option><option>Triangle</option><option>Inverted triangle</option><option>Hourglass</option><option>Oval</option></select></label>
    <label>Preferred fit<select value={form.preferredFit} onChange={(e)=>setForm({...form,preferredFit:e.target.value})}><option value="slim">Slim</option><option value="regular">Regular</option><option value="relaxed">Relaxed</option></select></label>
    <label>Favourite colours<input value={form.favoriteColors} onChange={(e)=>setForm({...form,favoriteColors:e.target.value})} placeholder="Navy, cream, olive"/></label>
    <label>Main occasion<select value={form.occasion} onChange={(e)=>setForm({...form,occasion:e.target.value})}><option>Everyday</option><option>Work</option><option>Events</option><option>Travel</option><option>Active</option></select></label>
    <div className="wide"><strong>Style directions</strong><div className="chips">{options.map((style)=><button type="button" key={style} className={selected.includes(style)?"active":""} onClick={()=>toggleStyle(style)}>{style}</button>)}</div></div>
    {["chest","waist","hips","height"].map((field)=><label key={field}>{field[0].toUpperCase()+field.slice(1)} (cm)<input type="number" min="40" max="250" value={form[field]} onChange={(e)=>setForm({...form,[field]:e.target.value})}/></label>)}
    <button className="save" type="submit">Save my profile</button>
  </Form></UserContent></UserDashboardWrapper></Container></main>;
};
export default StyleProfileScreen;
