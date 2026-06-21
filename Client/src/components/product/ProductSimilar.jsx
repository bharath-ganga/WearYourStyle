import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config/apiConfig";
import { Section } from "../../styles/styles";
import Title from "../common/Title";
import ProductList from "./ProductList";

const ProductSimilar = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const data = await response.json();
        if (Array.isArray(data)) {
          // Shuffle and limit to 4
          const shuffled = [...data].sort(() => 0.5 - Math.random());
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
  }, []);

  return (
    <Section>
      <Title titleText={"Similar Products"} />
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <i className="bi bi-arrow-clockwise fa-spin text-3xl" style={{ animation: "spin 1s linear infinite" }}></i>
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        <ProductList products={products} />
      )}
    </Section>
  );
};

export default ProductSimilar;
