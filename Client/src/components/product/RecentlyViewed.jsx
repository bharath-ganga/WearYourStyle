import { useMemo } from "react";
import styled from "styled-components";
import ProductList from "./ProductList";

const Wrap = styled.section`margin-top:64px; h2{font-size:28px;margin-bottom:22px;}`;
const RecentlyViewed = ({ excludeId }) => {
  const products = useMemo(() => { try { return JSON.parse(localStorage.getItem("recentlyViewed") || "[]").filter((item) => item.id !== excludeId).slice(0,4); } catch { return []; } }, [excludeId]);
  if (!products.length) return null;
  return <Wrap><h2>Recently viewed</h2><ProductList products={products}/></Wrap>;
};
export default RecentlyViewed;
