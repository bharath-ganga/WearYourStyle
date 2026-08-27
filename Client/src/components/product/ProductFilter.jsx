import styled from "styled-components";
import { useState } from "react";

const Panel = styled.aside`
  padding:22px;
  h3 { font-size:20px; margin-bottom:22px; }
  fieldset { border:0; padding:0; margin:0 0 24px; }
  legend { font-weight:800; margin-bottom:12px; }
  label { display:flex; align-items:center; gap:9px; color:#545a5a; margin:9px 0; cursor:pointer; }
  input[type="checkbox"] { width:17px; height:17px; accent-color:#d45b3f; }
  input[type="range"] { width:100%; accent-color:#d45b3f; }
  .price { display:flex; justify-content:space-between; color:#545a5a; margin-top:6px; }
  button { width:100%; border:1px solid #c9c5bc; border-radius:999px; padding:10px; font-weight:700; }
  .mobile-toggle { display:none; }
  @media(max-width:991px){
    .mobile-toggle{display:flex;align-items:center;justify-content:space-between;background:#fff;margin-bottom:0;}
    h3{display:none}.filters-body{padding-top:20px}.filters-body.hidden{display:none}
  }
`;

const ProductFilter = ({ facets, filters, onChange, onClear }) => {
  const [expanded, setExpanded] = useState(() => typeof window === "undefined" || window.innerWidth > 991);
  const toggle = (key, value) => onChange({ ...filters, [key]: filters[key] === value ? "" : value });
  return <Panel aria-label="Product filters">
    <button type="button" className="mobile-toggle" aria-expanded={expanded} onClick={()=>setExpanded((value)=>!value)}><span>Filters & sizes</span><i className={`bi bi-chevron-${expanded?"up":"down"}`}></i></button>
    <div className={`filters-body ${expanded ? "" : "hidden"}`}><h3>Refine your edit</h3>
    <fieldset><legend>Category</legend>{facets.categories.map((category) => <label key={category}><input type="checkbox" checked={filters.category === category} onChange={() => toggle("category", category)} />{category}</label>)}</fieldset>
    <fieldset><legend>Size</legend>{facets.sizes.map((size) => <label key={size}><input type="checkbox" checked={filters.size === size} onChange={() => toggle("size", size)} />{size.toUpperCase()}</label>)}</fieldset>
    <fieldset><legend>Maximum price</legend><input aria-label="Maximum price" type="range" min="0" max={facets.maxPrice} step="100" value={filters.maxPrice ?? facets.maxPrice} onChange={(event) => onChange({ ...filters, maxPrice: Number(event.target.value) })} /><div className="price"><span>₹0</span><strong>₹{Number(filters.maxPrice ?? facets.maxPrice).toLocaleString("en-IN")}</strong></div></fieldset>
    <label><input type="checkbox" checked={filters.inStock} onChange={(event) => onChange({ ...filters, inStock:event.target.checked })} />In stock only</label>
    <button type="button" onClick={onClear}>Clear all</button>
    </div>
  </Panel>;
};

export default ProductFilter;
