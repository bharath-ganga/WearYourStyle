import React, { useMemo, useState, useEffect } from "react";
import styled from "styled-components";
import { API_BASE_URL } from "../../config/apiConfig";
import { Container, ContentStylings, Section } from "../../styles/styles";
import Breadcrumb from "../../components/common/Breadcrumb";
import { Link } from "react-router-dom";
import ProductList from "../../components/product/ProductList";
import Title from "../../components/common/Title";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import { defaultFallbackProducts } from "../../data/fallbackProducts";
import ProductFilter from "../../components/product/ProductFilter";

const ProductsContent = styled.div`
  grid-template-columns: 280px minmax(0, 1fr);
  margin: 32px 0;
  gap: 30px;

  @media (max-width: ${breakpoints.xl}) {
    grid-template-columns: 260px auto;
  }

  @media (max-width: ${breakpoints.lg}) {
    grid-template-columns: 100%;
    row-gap: 24px;
  }
`;

const ProductsContentLeft = styled.div`
  border: 1px solid rgba(190, 188, 189, 0.4);
  border-radius: 18px;
  background: ${(props) => props.theme.color_white};
  overflow: hidden;

  @media (max-width: ${breakpoints.lg}) {
    display: grid;
  }
`;

const ProductsContentRight = styled.div`
  padding: 4px 0 4px 8px;

  .products-right-top {
    margin-bottom: 40px;
    @media (max-width: ${breakpoints.lg}) {
      margin-bottom: 24px;
    }
    @media (max-width: ${breakpoints.sm}) {
      flex-direction: column;
      row-gap: 16px;
      align-items: flex-start;
    }
  }

  .products-right-nav {
    column-gap: 16px;
    li {
      a.active {
        color: ${defaultTheme.color_sea_green};
      }
    }
  }

  @media (max-width: ${breakpoints.lg}) {
    padding-left: 12px;
    padding-right: 12px;
  }

  @media (max-width: ${breakpoints.sm}) {
    padding-left: 0;
    padding-right: 0;
  }

  .product-card-list {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .product-card {
    padding-left: 0;
    padding-right: 0;
  }
`;

const DescriptionContent = styled.div`
  .content-stylings {
    margin-left: 32px;
    @media (max-width: ${breakpoints.sm}) {
      margin-left: 0;
    }
  }
`;

const ProductListScreen = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(new URLSearchParams(window.location.search).get("q") || "");
  const [sort, setSort] = useState("featured");
  const initialFilters = { category: "", size: "", maxPrice: null, inStock: false };
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const contentType = response.headers.get("content-type");

        if (response.ok && contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setProducts(data);
            return;
          }
        }
        console.warn("API response was not JSON array. Using fallback products.");
        setProducts(defaultFallbackProducts);
      } catch (error) {
        console.warn("Failed to fetch products. Using fallback products:", error);
        setProducts(defaultFallbackProducts);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const facets = useMemo(() => ({
    categories: [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    sizes: [...new Set(products.flatMap((product) => Array.isArray(product.sizes) ? product.sizes : []).filter(Boolean))].sort(),
    maxPrice: Math.max(1000, Math.ceil(Math.max(...products.map((product) => Number(product.price) || 0), 1000) / 100) * 100),
  }), [products]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = products.filter((product) => {
      const searchable = `${product.title || ""} ${product.brand || ""} ${product.category || ""}`.toLowerCase();
      return (!normalized || searchable.includes(normalized)) &&
        (!filters.category || product.category === filters.category) &&
        (!filters.size || (product.sizes || []).includes(filters.size)) &&
        (filters.maxPrice == null || (Number(product.price) || 0) <= filters.maxPrice) &&
        (!filters.inStock || Number(product.stock) > 0);
    });
    return [...matches].sort((a, b) => sort === "price-low" ? Number(a.price) - Number(b.price) : sort === "price-high" ? Number(b.price) - Number(a.price) : sort === "rating" ? Number(b.rating || 0) - Number(a.rating || 0) : 0);
  }, [products, query, filters, sort]);

  const breadcrumbItems = [
    { label: "Home", link: "/" },
    { label: "Products", link: "" },
  ];
  return (
    <main className="page-py-spacing">
      <Container>
        <Breadcrumb items={breadcrumbItems} />
        <ProductsContent className="grid items-start">
          <ProductsContentLeft>
            <ProductFilter facets={facets} filters={filters} onChange={setFilters} onClear={() => setFilters(initialFilters)} />
          </ProductsContentLeft>
          <ProductsContentRight>
            <div className="products-right-top flex items-center justify-between">
              <div><h4 className="text-xxl">The full collection</h4><p className="text-gray text-sm">{visibleProducts.length} products</p></div>
              <div className="flex items-center" style={{ gap: 10, flexWrap: "wrap" }}>
                <input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search styles, brands…" style={{ border:"1px solid #c9c5bc", borderRadius:999, padding:"10px 15px", minWidth:220 }} />
                <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)} style={{ border:"1px solid #c9c5bc", borderRadius:999, padding:"10px 15px", background:"white" }}><option value="featured">Featured</option><option value="rating">Top rated</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <i className="bi bi-arrow-clockwise fa-spin text-4xl" style={{ animation: "spin 1s linear infinite" }}></i>
                <span className="ml-3 text-lg font-semibold">Loading...</span>
              </div>
            ) : (
              visibleProducts.length ? <ProductList products={visibleProducts} /> : <div style={{ padding:"70px 20px", textAlign:"center", border:"1px dashed #c9c5bc", borderRadius:18 }}><h3>No exact matches</h3><p>Try removing a filter or searching another term.</p></div>
            )}
          </ProductsContentRight>
        </ProductsContent>
      </Container>
      <Section>
        <Container>
          <DescriptionContent>
            <Title titleText={"Clothing for Everyone Online"} />
            <ContentStylings className="text-base content-stylings">
              <h4>A considered collection for real wardrobes.</h4>
              <p>
                Discover everyday staples, statement pieces, footwear, and
                easy layers selected for comfort, repeat wear, and personal style.
              </p>
              <p>
                Search by name or brand, then refine the collection by category,
                size, availability, and price. Save favourites to compare later.
              </p>
              <h4>Make a confident choice before checkout.</h4>
              <p>
                Open a product to review stock, delivery timing, community fit
                notes, your recommended size, and virtual try-on eligibility.
              </p>
              <Link to="/faqs">Shopping guide</Link>
            </ContentStylings>
          </DescriptionContent>
        </Container>
      </Section>
    </main>
  );
};

export default ProductListScreen;
