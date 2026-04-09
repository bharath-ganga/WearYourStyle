import styled from "styled-components";
import { Container } from "../../styles/styles";
import Breadcrumb from "../../components/common/Breadcrumb";
import ProductPreview from "../../components/product/ProductPreview";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { BaseLinkGreen, BaseButtonGreen } from "../../styles/button";
import { currencyFormat } from "../../utils/helper";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import ProductSimilar from "../../components/product/ProductSimilar";
import ProductServices from "../../components/product/ProductServices";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/slices/cartSlice";
import { toast } from "react-hot-toast";

const DetailsScreenWrapper = styled.main`
  margin: 40px 0;
`;

const DetailsContent = styled.div`
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;

  @media (max-width: ${breakpoints.xl}) {
    gap: 24px;
    grid-template-columns: 3fr 2fr;
  }

  @media (max-width: ${breakpoints.lg}) {
    grid-template-columns: 100%;
  }
`;

const ProductDetailsWrapper = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 24px;

  @media (max-width: ${breakpoints.sm}) {
    padding: 16px;
  }

  @media (max-width: ${breakpoints.xs}) {
    padding: 12px;
  }

  .prod-title {
    margin-bottom: 10px;
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
    const [product, setProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedColor, setSelectedColor] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`http://localhost:3000/api/products/${id}`);
                if (response.ok) {
                    const foundProduct = await response.json();
                    setProduct(foundProduct);
                    if (foundProduct.sizes?.length > 0) setSelectedSize(foundProduct.sizes[0]);
                    if (foundProduct.colors?.length > 0) setSelectedColor(foundProduct.colors[0]);
                } else {
                    setProduct(null);
                }
            } catch (error) {
                console.error("Failed to fetch product", error);
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

    const isTryOnable = product.title.toLowerCase().includes("shirt") || 
                        product.title.toLowerCase().includes("top") ||
                        product.title.toLowerCase().includes("wear") ||
                        product.title.toLowerCase().includes("t-shirt");

    return (
        <DetailsScreenWrapper>
            <Container>
                <Breadcrumb items={breadcrumbItems} />
                <DetailsContent className="grid">
                    <ProductPreview previewImages={product.previewImages || [{ id: "1", imgSource: product.imgSource }]} />
                    <ProductDetailsWrapper>
                        <h2 className="prod-title">{product.title}</h2>
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
                                <Link to="/" className="text-lg text-gray font-medium">
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

                            {isTryOnable && (
                                <BaseLinkGreen
                                    to="/virtual_try_on"
                                    state={{ 
                                        productId: product.id, 
                                        imgSource: product.imgSource || (product.previewImages && product.previewImages[0]?.imgSource) 
                                    }}
                                    className="prod-add-btn"
                                    style={{ backgroundColor: "#8a33fd", borderColor: "#8a33fd" }}
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
                <ProductSimilar />
            </Container>
        </DetailsScreenWrapper>
    );
};

export default ProductDetailsScreen;