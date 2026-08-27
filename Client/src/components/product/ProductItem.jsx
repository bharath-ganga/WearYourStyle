import { PropTypes } from "prop-types";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { commonCardStyles } from "../../styles/card";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import { currencyFormat } from "../../utils/helper";
import { useAuth } from "../../context/AuthContext";

const ProductCardWrapper = styled(Link)`
  ${commonCardStyles}
  @media(max-width: ${breakpoints.sm}) {
    padding-left: 0;
    padding-right: 0;
  }

  .product-img {
    aspect-ratio: 4 / 5;
    height: auto;
    position: relative;

    @media (max-width: ${breakpoints.sm}) {
      height: auto;
    }
  }

  .product-wishlist-icon {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 38px;
    height: 38px;
    border-radius: 100%;

    &:hover {
      background-color: ${defaultTheme.color_sea_green};
      color: ${defaultTheme.color_white};
    }
  }

  .product-info { padding: 0 4px; }
  .product-info > p {
    font-size: 15px;
    line-height: 1.4;
    margin-bottom: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const ProductItem = ({ product }) => {
  const { wishlist, toggleWishlist } = useAuth();
  const saved = wishlist.some((item) => item.id === product.id);
  return (
    <ProductCardWrapper key={product.id} to={`/product/details/${product.id}`}>
      <div className="product-img">
        <img className="object-fit-cover" src={product.imgSource} alt={product.title} />
        <button
          type="button"
          className="product-wishlist-icon flex items-center justify-center bg-white"
          aria-label={`${saved ? "Remove" : "Add"} ${product.title} ${saved ? "from" : "to"} wishlist`}
          aria-pressed={saved}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleWishlist(product);
          }}
        >
          <i className={`bi ${saved ? "bi-heart-fill" : "bi-heart"}`} style={saved ? { color: "#d45b3f" } : undefined}></i>
        </button>
      </div>
      <div className="product-info">
        <p className="font-bold">{product.title}</p>
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-gray">{product.brand}</span>
          <span className="text-outerspace font-bold">{currencyFormat(product.price)}</span>
        </div>
      </div>
    </ProductCardWrapper>
  );
};

export default ProductItem;

ProductItem.propTypes = {
  product: PropTypes.object,
};
