import styled from "styled-components";
import { HeaderMainWrapper, SiteBrandWrapper } from "../../styles/header";
import { Container } from "../../styles/styles";
import { staticImages } from "../../utils/images";
import { navMenuData } from "../../data/data";
import { Link, useLocation } from "react-router-dom";
import { Input, InputGroupWrapper } from "../../styles/form";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../redux/slices/sidebarSlice";
import { useEffect } from "react";
import { getCartTotal } from "../../redux/slices/cartSlice";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

const NavigationAndSearchWrapper = styled.div`
  column-gap: 20px;
  .search-form {
    @media (max-width: ${breakpoints.lg}) {
      width: 100%;
      max-width: 500px;
    }
    @media (max-width: ${breakpoints.sm}) {
      display: none;
    }
  }

  .input-group {
    min-width: 320px;

    .input-control {
      @media (max-width: ${breakpoints.sm}) {
        display: none;
      }
    }

    @media (max-width: ${breakpoints.xl}) {
      min-width: 160px;
    }

    @media (max-width: ${breakpoints.sm}) {
      min-width: auto;
      grid-template-columns: 100%;
    }
  }

  @media (max-width: ${breakpoints.lg}) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const NavigationMenuWrapper = styled.nav`
  .nav-menu-list {
    margin-left: 20px;

    @media (max-width: ${breakpoints.lg}) {
      flex-direction: column;
    }
  }

  .nav-menu-item {
    margin-right: 20px;
    margin-left: 20px;

    @media (max-width: ${breakpoints.xl}) {
      margin-left: 16px;
      margin-right: 16px;
    }
  }

  .nav-menu-link {
    position: relative;
    padding: 30px 0 27px;
    letter-spacing: -0.01em;
    &.active {
      color: ${(props) => props.theme.color_sea_green};
      font-weight: 700;
      &::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 2px;
        background: ${(props) => props.theme.color_sea_green};
      }
    }

    &:hover {
      color: ${(props) => props.theme.color_outerspace};
    }
  }

  @media (max-width: ${breakpoints.lg}) {
    position: absolute;
    top: 0;
    right: 0;
    width: 260px;
    background: ${(props) => props.theme.color_white};
    height: 100%;
    z-index: 999;
    display: none;
  }
`;

const IconLinksWrapper = styled.div`
  column-gap: 8px;
  .icon-link {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid transparent;

    &.active {
      background-color: ${(props) => props.theme.color_sea_green};
      img {
        filter: brightness(100);
      }
    }

    &:hover {
      background-color: ${(props) => props.theme.color_flash_white};
      border-color: ${(props) => props.theme.color_anti_flash_white};
      transform: translateY(-1px);
    }
  }

  .login-link {
    padding: 9px 16px;
    border: 1px solid ${(props) => props.theme.color_outerspace};
    border-radius: 999px;
    &:hover { background: ${(props) => props.theme.color_outerspace}; color: #fff; }
  }

  @media (max-width: ${breakpoints.xl}) {
    column-gap: 8px;
  }

  @media (max-width: ${breakpoints.xl}) {
    column-gap: 6px;
  }
`;

const Header = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated: isLoggedIn, wishlist, loading: authLoading } = useAuth();
  const { carts, itemsCount } = useSelector((state) => state.cart);
  const { themeMode, toggleTheme } = useTheme();

  useEffect(() => {
    dispatch(getCartTotal());
  }, [carts, dispatch]);

  return (
    <HeaderMainWrapper className="header flex items-center">
      <Container className="container">
        <div className="header-wrap flex items-center justify-between">
          <div className="flex items-center">
            <button
              type="button"
              className="sidebar-toggler"
              onClick={() => dispatch(toggleSidebar())}
              aria-label="Open navigation menu"
            >
              <i className="bi bi-list"></i>
            </button>
            <SiteBrandWrapper to="/" className="inline-flex">
              <div className="brand-img-wrap flex items-center justify-center">
                <img
                  className="site-brand-img"
                  src={staticImages.logo}
                  alt="site logo"
                />
              </div>
              <span className="site-brand-text text-outerspace">WearYourStyle</span>
            </SiteBrandWrapper>
          </div>
          <NavigationAndSearchWrapper className="flex items-center">
            <NavigationMenuWrapper>
              <ul className="nav-menu-list flex items-center">
                {navMenuData?.map((menu) => {
                  return (
                    <li className="nav-menu-item" key={menu.id}>
                      <Link
                        to={menu.menuLink}
                        className={`nav-menu-link text-base font-medium text-gray ${location.pathname === menu.menuLink ? "active" : ""}`}
                      >
                        {menu.menuText}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </NavigationMenuWrapper>
          </NavigationAndSearchWrapper>

          <IconLinksWrapper className="flex items-center">
            {!authLoading && !isLoggedIn && (
              <Link to="/sign_in" className="login-link text-base font-semibold text-outerspace">
                Login
              </Link>
            )}
            <Link
              to="/wishlist"
              className={`icon-link ${location.pathname === "/wishlist" ? "active" : ""
                } inline-flex items-center justify-center relative`}
              aria-label="Wishlist"
            >
              <img src={staticImages.heart} alt="" />
              {wishlist.length > 0 && <span className="absolute -top-1 -right-1 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: "#d45b3f" }}>{wishlist.length}</span>}
            </Link>
            <Link
              to="/account"
              className={`icon-link ${location.pathname === "/account" ||
                  location.pathname === "/account/add"
                  ? "active"
                  : ""
                } inline-flex items-center justify-center`}
              aria-label="Account"
            >
              <img src={staticImages.user} alt="" />
            </Link>
            <Link
              to="/cart"
              className={`icon-link ${location.pathname === "/cart" ? "active" : ""
                } inline-flex items-center justify-center relative`}
              aria-label={`Cart with ${itemsCount} items`}
            >
              <img src={staticImages.cart} alt="" />
              {itemsCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                  style={{ backgroundColor: "#d45b3f" }}
                >
                  {itemsCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-link inline-flex items-center justify-center"
              title="Toggle Theme"
              aria-label="Toggle color theme"
              style={{ fontSize: '20px', color: themeMode === 'light' ? '#3c4242' : '#ffffff' }}
            >
              {themeMode === "light" ? (
                <i className="bi bi-moon-fill"></i>
              ) : (
                <i className="bi bi-sun-fill"></i>
              )}
            </button>
          </IconLinksWrapper>
        </div>
      </Container>
    </HeaderMainWrapper>
  );
};

export default Header;
