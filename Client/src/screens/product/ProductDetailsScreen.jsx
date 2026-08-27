import styled from "styled-components";
import { Container } from "../../styles/styles";
import { API_BASE_URL } from "../../config/apiConfig";
import { defaultFallbackProducts } from "../../data/fallbackProducts";
import Breadcrumb from "../../components/common/Breadcrumb";
import ProductPreview from "../../components/product/ProductPreview";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { BaseLinkGreen, BaseButtonGreen } from "../../styles/button";
import { currencyFormat } from "../../utils/helper";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import ProductSimilar from "../../components/product/ProductSimilar";
import CompleteLook from "../../components/product/CompleteLook";
import ProductServices from "../../components/product/ProductServices";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/slices/cartSlice";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import ProductReviews from "../../components/product/ProductReviews";
import RecentlyViewed from "../../components/product/RecentlyViewed";

const DetailsScreenWrapper = styled.main`
  margin: 52px 0 80px;
`;

const DetailsContent = styled.div`
  grid-template-columns: repeat(2, 1fr);
  gap: 56px;

  @media (max-width: ${breakpoints.xl}) {
    gap: 24px;
    grid-template-columns: 3fr 2fr;
  }

  @media (max-width: ${breakpoints.lg}) {
    grid-template-columns: 100%;
  }
`;

const ProductDetailsWrapper = styled.div`
  border: 1px solid ${(props) => props.theme.color_anti_flash_white};
  border-radius: 22px;
  padding: 38px;
  background: ${(props) => props.theme.color_white};

  @media (max-width: ${breakpoints.sm}) {
    padding: 16px;
  }

  @media (max-width: ${breakpoints.xs}) {
    padding: 12px;
  }

  .prod-title {
    margin-bottom: 14px;
    font-family: "Playfair Display", Georgia, serif;
    font-size: clamp(30px, 4vw, 48px);
    letter-spacing: -.035em;
  }
  .rating-and-comments {
    column-gap: 16px;
    margin-bottom: 20px;
  }
  .prod-rating {
    column-gap: 10px;
  }
  .prod-comments {
    column-gap: 10px;
  }
  .prod-add-btn {
    min-width: 160px;
    column-gap: 8px;
    &-text {
      margin-top: 2px;
    }
  }

  .btn-and-price {
    margin-top: 36px;
    column-gap: 16px;
    row-gap: 10px;

    @media (max-width: ${breakpoints.sm}) {
      margin-top: 24px;
    }
  }
`;

const ProductSizeWrapper = styled.div`
  .prod-size-top {
    gap: 20px;
  }
  .prod-size-list {
    gap: 12px;
    margin-top: 16px;
    @media (max-width: ${breakpoints.sm}) {
      gap: 8px;
    }
  }

  .prod-size-item {
    position: relative;
    height: 38px;
    width: 38px;
    cursor: pointer;

    @media (max-width: ${breakpoints.sm}) {
      width: 32px;
      height: 32px;
    }

    input {
      position: absolute;
      top: 0;
      left: 0;
      width: 38px;
      height: 38px;
      opacity: 0;
      cursor: pointer;

      @media (max-width: ${breakpoints.sm}) {
        width: 32px;
        height: 32px;
      }

      &:checked + span {
        color: ${defaultTheme.color_white};
        background-color: ${defaultTheme.color_outerspace};
        border-color: ${defaultTheme.color_outerspace};
      }
    }

    span {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      border: 1.5px solid ${defaultTheme.color_silver};
      text-transform: uppercase;

      @media (max-width: ${breakpoints.sm}) {
        width: 32px;
        height: 32px;
      }
    }
  }
`;

const ProductColorWrapper = styled.div`
  margin-top: 32px;

  @media (max-width: ${breakpoints.sm}) {
    margin-top: 24px;
  }

  .prod-colors-top {
    margin-bottom: 16px;
  }

  .prod-colors-list {
    column-gap: 12px;
  }

  .prod-colors-item {
    position: relative;
    width: 22px;
    height: 22px;
    transition: ${defaultTheme.default_transition};

    &:hover {
      scale: 0.9;
    }

    input {
      position: absolute;
      top: 0;
      left: 0;
      width: 22px;
      height: 22px;
      opacity: 0;
      cursor: pointer;

      &:checked + span {
        outline: 1px solid ${defaultTheme.color_gray};
        outline-offset: 3px;
      }
    }

    .prod-colorbox {
      border-radius: 100%;
      width: 22px;
      height: 22px;
      display: inline-block;
    }
  }
`;

const ProductDetailsScreen = () => {
    const { id } = useParams();
    const location = useLocation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, wishlist, toggleWishlist } = useAuth();
    const [product, setProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedColor, setSelectedColor] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
                const contentType = response.headers.get("content-type");

                if (response.ok && contentType && contentType.includes("application/json")) {
                    const foundProduct = await response.json();
                    if (foundProduct && foundProduct.id) {
                        setProduct(foundProduct);
                        const recent = JSON.parse(localStorage.getItem("recentlyViewed") || "[]").filter((item) => item.id !== foundProduct.id);
                        localStorage.setItem("recentlyViewed", JSON.stringify([foundProduct, ...recent].slice(0, 8)));
                        if (foundProduct.sizes?.length > 0) setSelectedSize(foundProduct.sizes[0]);
                        if (foundProduct.colors?.length > 0) setSelectedColor(foundProduct.colors[0]);
                        return;
                    }
                }
                const fallback = defaultFallbackProducts.find(p => p.id === id) || defaultFallbackProducts[0];
                setProduct(fallback);
            } catch (error) {
                console.warn("Failed to fetch product, using fallback:", error);
                const fallback = defaultFallbackProducts.find(p => p.id === id) || defaultFallbackProducts[0];
                setProduct(fallback);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) {
        return (
            <Container>
                <div className="flex justify-center items-center py-40">
                    <i className="bi bi-arrow-clockwise fa-spin text-5xl" style={{ animation: "spin 1s linear infinite" }}></i>
                    <span className="ml-4 text-2xl font-bold text-gray-500">Loading Product...</span>
                </div>
            </Container>
        );
    }

    if (!product) return <Container><p className="py-20 text-center text-xl">Product not found!</p></Container>;

    const handleAddToCart = () => {
        const cartItem = {
            id: String(product.id) + selectedSize + selectedColor,
            productId: product.id,
            title: product.title,
            imgSource: product.imgSource || (product.previewImages && product.previewImages[0]?.imgSource),
            price: product.price,
            quantity: 1,
            totalPrice: product.price,
            size: selectedSize,
            color: selectedColor,
            shipping: 0
        };
        dispatch(addToCart(cartItem));
        toast.success("Added to cart!");
        navigate("/cart");
    };

    const stars = Array.from({ length: 5 }, (_, index) => (
        <span
            key={index}
            className={`text-yellow ${
                index < Math.floor(product.rating || 0)
                    ? "bi bi-star-fill"
                    : index + 0.5 === product.rating
                    ? "bi bi-star-half"
                    : "bi bi-star"
            }`}
        ></span>
    ));

    const breadcrumbItems = [
        { label: "Shop", link: "/product" },
        { label: product.title, link: "" },
    ];

    const tryOnText = `${product.title} ${product.category || ""}`.toLowerCase();
    const isTryOnable = ["shirt", "top", "t-shirt", "tshirt"].some((term) =>
        tryOnText.includes(term)
    );
    const chest = Number(user?.measurements?.chest || 0);
    const recommendedSize = chest && product.sizes?.length
        ? product.sizes[Math.min(product.sizes.length - 1, chest < 86 ? 0 : chest < 94 ? 1 : chest < 102 ? 2 : 3)]
        : null;
    const saved = wishlist.some((item) => item.id === product.id);

    return (
        <DetailsScreenWrapper>
            <Container>
                <Breadcrumb items={breadcrumbItems} />
                <DetailsContent className="grid">
                    <ProductPreview previewImages={product.previewImages || [{ id: "1", imgSource: product.imgSource }]} />
                    <ProductDetailsWrapper>
                        <h2 className="prod-title">{product.title}</h2>
                        <p style={{ color:Number(product.stock) > 0 ? "#187a58" : "#b42318", fontWeight:700, marginBottom:12 }}>{Number(product.stock) > 0 ? `${product.stock} in stock · Delivery in 3–7 days` : "Currently unavailable"}</p>
                        <div className="flex items-center rating-and-comments">
                            <div className="prod-rating flex items-center">
                                {stars}
                                <span className="text-gray text-sm ml-2">{product.rating}</span>
                            </div>
                        </div>

                        <ProductSizeWrapper>
                            <div className="prod-size-top flex items-center flex-wrap">
                                <p className="text-lg font-semibold text-outerspace">
                                    Select size
                                </p>
                                <Link to="/faqs" className="text-lg text-gray font-medium">
                                    Size Guide &nbsp; <i className="bi bi-arrow-right"></i>
                                </Link>
                            </div>
                            <div className="prod-size-list flex items-center">
                                {product.sizes?.map((size, index) => (
                                    <div className="prod-size-item" key={index} onClick={() => setSelectedSize(size)}>
                                        <input type="radio" name="size" checked={selectedSize === size} readOnly />
                                        <span className="flex items-center justify-center font-medium text-outerspace text-sm">
                                            {size}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ marginTop:12, color:"#616666" }}>{recommendedSize ? <>Recommended from your measurements: <strong>{recommendedSize}</strong></> : <Link to="/style-profile">Add measurements for a size recommendation →</Link>}</p>
                        </ProductSizeWrapper>

                        <ProductColorWrapper>
                            <div className="prod-colors-top flex items-center flex-wrap">
                                <p className="text-lg font-semibold text-outerspace">
                                    Colours Available
                                </p>
                            </div>
                            <div className="prod-colors-list flex items-center">
                                {product?.colors?.map((color, index) => (
                                    <div className="prod-colors-item" key={index} onClick={() => setSelectedColor(color)}>
                                        <input type="radio" name="colors" checked={selectedColor === color} readOnly />
                                        <span
                                            className="prod-colorbox"
                                            style={{ background: `${color}` }}
                                        ></span>
                                    </div>
                                ))}
                            </div>
                        </ProductColorWrapper>

                        <div className="btn-and-price flex items-center flex-wrap">
                            <BaseButtonGreen
                                onClick={handleAddToCart}
                                className="prod-add-btn"
                            >
                                <span className="prod-add-btn-icon">
                                    <i className="bi bi-cart2"></i>
                                </span>
                                <span className="prod-add-btn-text">Add to cart</span>
                            </BaseButtonGreen>
                            <button type="button" onClick={() => toggleWishlist(product)} aria-pressed={saved} style={{ minHeight:44, border:"1px solid #c9c5bc", borderRadius:999, padding:"0 17px", fontWeight:700 }}><i className={`bi ${saved ? "bi-heart-fill" : "bi-heart"}`} style={{ color:saved ? "#d45b3f" : "inherit", marginRight:7 }}></i>{saved ? "Saved" : "Save"}</button>

                            {isTryOnable && (
                                <BaseLinkGreen
                                    to="/virtual_try_on"
                                    state={{ 
                                        productId: product.id, 
                                        imgSource: product.imgSource || (product.previewImages && product.previewImages[0]?.imgSource) 
                                    }}
                                    className="prod-add-btn"
                                    style={{ backgroundColor: "#23231f", borderColor: "#23231f" }}
                                >
                                    <span className="prod-add-btn-icon">
                                        <i className="bi bi-camera"></i>
                                    </span>
                                    <span className="prod-add-btn-text">Virtual Try On</span>
                                </BaseLinkGreen>
                            )}

                            <span className="prod-price text-xl font-bold text-outerspace">
                                {currencyFormat(product.price)}
                            </span>
                        </div>
                        <ProductServices />
                    </ProductDetailsWrapper>
                </DetailsContent>
                <CompleteLook currentProduct={product} />
                <ProductReviews productId={product.id} />
                <ProductSimilar />
                <RecentlyViewed excludeId={product.id} />
            </Container>
        </DetailsScreenWrapper>
    );
};

export default ProductDetailsScreen;
