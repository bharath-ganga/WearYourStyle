import styled from "styled-components";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Container } from "../../styles/styles";
import Breadcrumb from "../../components/common/Breadcrumb";
import Title from "../../components/common/Title";
import { currencyFormat } from "../../utils/helper";
import { useAuth } from "../../context/AuthContext";
import { addToCart } from "../../redux/slices/cartSlice";

const Page = styled.main`
  padding: 54px 0 88px;
  .head { display:flex; justify-content:space-between; align-items:end; gap:20px; margin:28px 0; }
  .head p { color:#616666; margin-top:8px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:22px; }
  .card { border:1px solid #dedbd3; border-radius:18px; overflow:hidden; background:#fff; }
  .photo { display:block; aspect-ratio:4/5; overflow:hidden; background:#f4f1ea; }
  .photo img { width:100%; height:100%; object-fit:cover; transition:transform .3s ease; }
  .photo:hover img { transform:scale(1.025); }
  .body { padding:18px; }
  .brand { color:#777; font-size:13px; text-transform:uppercase; letter-spacing:.06em; }
  h3 { font-size:17px; margin:5px 0 12px; min-height:46px; }
  .row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .actions { display:grid; grid-template-columns:1fr auto; gap:8px; margin-top:15px; }
  button,.browse { border:1px solid #263333; border-radius:999px; padding:10px 14px; font-weight:700; }
  .add { background:#263333; color:#fff; }
  .remove { width:42px; padding:0; background:#fff; color:#d45b3f; }
  .empty { text-align:center; border:1px dashed #c9c5bc; border-radius:22px; padding:72px 20px; }
  .empty i { font-size:48px; color:#d45b3f; }
  .browse { display:inline-flex; margin-top:20px; background:#263333; color:#fff; }
`;

const WishListScreen = () => {
  const { wishlist, toggleWishlist, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const moveToCart = (product) => {
    dispatch(addToCart({ ...product, productId: product.id, quantity: 1, totalPrice: Number(product.price), shipping:0, size:product.sizes?.[0] || "One size", color:product.colors?.[0] || "Default" }));
    toggleWishlist(product);
    toast.success("Moved to cart");
  };
  return <Page><Container>
    <Breadcrumb items={[{ label:"Home", link:"/" }, { label:"Wishlist", link:"/wishlist" }]} />
    <div className="head"><div><Title titleText="Your wishlist" /><p>{isAuthenticated ? "Saved to your account." : "Saved on this device. Sign in to sync it everywhere."}</p></div><strong>{wishlist.length} saved</strong></div>
    {wishlist.length ? <div className="grid">{wishlist.map((product) => <article className="card" key={product.id}>
      <Link className="photo" to={`/product/details/${product.id}`}><img src={product.imgSource} alt={product.title} /></Link>
      <div className="body"><span className="brand">{product.brand || "WearYourStyle"}</span><h3>{product.title}</h3><div className="row"><strong>{currencyFormat(product.price)}</strong><span>{Number(product.stock) > 0 ? "In stock" : "Check availability"}</span></div><div className="actions"><button className="add" onClick={() => moveToCart(product)}>Move to cart</button><button className="remove" aria-label={`Remove ${product.title}`} onClick={() => toggleWishlist(product)}><i className="bi bi-trash3"></i></button></div></div>
    </article>)}</div> : <div className="empty"><i className="bi bi-heart"></i><h2>Your wishlist is ready for a first find</h2><p>Tap the heart on any product to keep it here.</p><Link className="browse" to="/product">Explore the collection</Link></div>}
  </Container></Page>;
};

export default WishListScreen;
