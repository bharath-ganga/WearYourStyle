import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./screens/home/HomeScreen";
// layouts
import BaseLayout from "./components/layout/BaseLayout";
import AuthLayout from "./components/layout/AuthLayout";
import { GlobalStyles } from "./styles/global/GlobalStyles";
// auth pages
import SignIn from "./screens/auth/SignInScreen";
import SignUp from "./screens/auth/SignUpScreen";
import Reset from "./screens/auth/ResetScreen";
import ChangePassword from "./screens/auth/ChangePasswordScreen";
import CheckMail from "./screens/auth/CheckMailScreen";
import Verification from "./screens/auth/VerificationScreen";
import NotFound from "./screens/error/NotFoundScreen";
import ProductList from "./screens/product/ProductListScreen";
import ProductDetails from "./screens/product/ProductDetailsScreen";
import Cart from "./screens/cart/CartScreen";
import CartEmpty from "./screens/cart/CartEmptyScreen";
import Checkout from "./screens/checkout/CheckoutScreen";
import Order from "./screens/user/OrderListScreen";
import OrderDetail from "./screens/user/OrderDetailScreen";
import WishList from "./screens/user/WishListScreen";
import WishListEmpty from "./screens/user/WishListEmptyScreen";
import Confirm from "./screens/user/ConfirmScreen";
import Account from "./screens/user/AccountScreen";
import Address from "./screens/user/AddressScreen";

const VirtualTryOn = lazy(() => import("./screens/VirtualTryOn"));
const Wardrobe = lazy(() => import("./screens/wardrobe/WardrobeScreen"));
const AdminLogin = lazy(() => import("./screens/admin/AdminLoginScreen"));
const AdminDashboard = lazy(() => import("./screens/admin/AdminDashboard"));
import { ThemeContextProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { AdminRoute, ProtectedRoute } from "./components/auth/RouteGuards";
import InfoScreen from "./screens/info/InfoScreen";
import StyleProfileScreen from "./screens/user/StyleProfileScreen";

function App() {
  return (
    <ThemeContextProvider>
      <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GlobalStyles />
        <Suspense fallback={<div style={{ minHeight:"60vh", display:"grid", placeItems:"center", fontWeight:700 }}>Loading experience…</div>}><Routes>
          {/* main screens */}
          <Route path="/" element={<BaseLayout />}>
            <Route index element={<Home />} />
            <Route path="/product" element={<ProductList />} />
            <Route path="/product/details/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/empty_cart" element={<CartEmpty />} />
            <Route path="/empty_wishlist" element={<WishListEmpty />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/order" element={<Order />} />
              <Route path="/order_detail/:id" element={<OrderDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/account" element={<Account />} />
              <Route path="/account/add" element={<Address />} />
              <Route path="/style-profile" element={<StyleProfileScreen />} />
              <Route path="/wardrobe" element={<Wardrobe />} />
              <Route path="/confirm" element={<Confirm />} />
            </Route>
            <Route path="/wishlist" element={<WishList />} />
            <Route path="/virtual_try_on" element={<VirtualTryOn />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            {["contact", "returns_refunds", "faqs", "career", "blog", "media", "tac", "privacy", "shipping", "sitemap"].map((page) => <Route key={page} path={`/${page}`} element={<InfoScreen />} />)}
          </Route>

          {/* auth screens */}
          <Route path="/" element={<AuthLayout />}>
            <Route path="sign_in" element={<SignIn />} />
            <Route path="sign_up" element={<SignUp />} />
            <Route path="reset" element={<Reset />} />
            <Route path="change_password" element={<ChangePassword />} />
            <Route path="check_mail" element={<CheckMail />} />
            <Route path="verification" element={<Verification />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes></Suspense>
      </Router>
      </AuthProvider>
    </ThemeContextProvider>
  );
}

export default App;
