import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config/apiConfig";
import { Section } from "../../styles/styles";
import Title from "../common/Title";
import ProductList from "./ProductList";

const CompleteLook = ({ currentProduct }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProduct) return;
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          // Filter out identical categories. E.g. If viewing a shirt, recommend shoes or pants.
          const currentLowerTitle = currentProduct.title.toLowerCase();
          const isCurrentTop = currentLowerTitle.includes("shirt") || currentLowerTitle.includes("top");
          
          const complementary = data.filter(item => {
             if (item.id === currentProduct.id) return false;
             const itemTitleLower = item.title.toLowerCase();
             const isItemTop = itemTitleLower.includes("shirt") || itemTitleLower.includes("top");
             // Complementary logic: If viewing Top, show Non-Top
             if (isCurrentTop) return !isItemTop;
             // If viewing Non-Top, show Tops
             return isItemTop;
          });

          // Fallback to random if not enough complementary
          let displayList = complementary.length > 0 ? complementary : data;
          const shuffled = [...displayList].sort(() => 0.5 - Math.random());
          setProducts(shuffled.slice(0, 4));
        } else {
          console.error("Failed to fetch products: expected array but got", data);
          setProducts([]);
        }
      } catch (error) {
        console.error("Failed to fetch products", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [currentProduct]);

  return (
    <Section style={{backgroundColor: '#eef4f4', padding: '40px 0', borderRadius: '12px', marginTop: '40px'}}>
      <Title titleText={"✨ Complete The Look ✨"} />
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <i className="bi bi-arrow-clockwise fa-spin text-3xl" style={{ animation: "spin 1s linear infinite" }}></i>
          <span className="ml-2">Styling your Look...</span>
        </div>
      ) : (
        <div style={{padding: '0 20px'}}>
          <ProductList products={products} />
        </div>
      )}
    </Section>
  );
};

export default CompleteLook;
