import { useState, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import { Container } from "../../styles/styles";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";
import { toast } from "react-hot-toast";
import { currencyFormat } from "../../utils/helper";

const ORDER_STATUSES = ["Order Placed", "Confirmed", "Shipped", "Out for delivery", "Delivered", "Cancelled", "Return requested", "Returned"];
const CLOSED_STATUSES = ["Cancelled", "Returned"];
// Keep in sync with LOW_STOCK_THRESHOLD in Server/src/controller/admin.controller.js
const LOW_STOCK = 10;
const CATEGORIES = ["Shirts", "Pants", "Shoes"];
const GENDERS = [["mens", "Men"], ["womens", "Women"], ["unisex", "Unisex"]];
const EMPTY_PRODUCT = { title: "", brand: "", price: "", stock: 20, imgSource: "", category: "Shirts", gender: "mens", sizes: "S|M|L|XL" };

const STATUS_COLORS = {
  Delivered: ["#e3f4ea", "#1f6b3d"],
  Cancelled: ["#fbe7e4", "#a3291b"],
  Returned: ["#fbe7e4", "#a3291b"],
  "Return requested": ["#fdf0dc", "#8a5300"],
  Shipped: ["#e5eefb", "#1f4f99"],
  "Out for delivery": ["#e5eefb", "#1f4f99"],
};

const AdminWrapper = styled.div`
  padding: 40px 0 80px;
  background: #f4f3ef;
  min-height: 100vh;

  h1 { font-size: 28px; }
  h3 { font-size: 18px; margin-bottom: 16px; }
`;

const AdminHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  gap: 16px;
  flex-wrap: wrap;
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 28px;
  border-bottom: 2px solid #23231f;
  overflow-x: auto;
`;

const Tab = styled.button`
  padding: 12px 20px;
  background: ${(props) => (props.$active ? "#23231f" : "transparent")};
  color: ${(props) => (props.$active ? "#fff" : "#23231f")};
  font-weight: 700;
  white-space: nowrap;
  &:hover { background: ${(props) => (props.$active ? "#23231f" : "#e6e3da")}; }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #dedbd3;

  th, td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid #ecebe6;
    vertical-align: top;
  }

  th {
    background: #23231f;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  tr.low td { background: #fdf0dc; }
`;

const TableScroll = styled.div`
  overflow-x: auto;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  background: ${(props) => (STATUS_COLORS[props.$status] || ["#eeece6"])[0]};
  color: ${(props) => (STATUS_COLORS[props.$status] || [null, "#3d3d38"])[1]};
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  background: #fff;
  border: 1px solid #dedbd3;
  padding: 22px;
  margin-bottom: 28px;

  label { display: grid; gap: 6px; font-size: 13px; font-weight: 700; color: #3d3d38; }
  .full { grid-column: 1 / -1; }
`;

const Input = styled.input`
  padding: 11px 12px;
  border: 1px solid #c9c5bc;
  background: #fff;
  &:focus { outline: 2px solid #d45b3f; outline-offset: -1px; }
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #c9c5bc;
  background: #fff;
`;

const StockInput = styled.input`
  width: 80px;
  padding: 8px;
  border: 1px solid #c9c5bc;
  text-align: right;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  border: 1px solid #dedbd3;
  background: #fff;

  div { padding: 22px; border-right: 1px solid #dedbd3; border-bottom: 1px solid #dedbd3; }
  span { color: #717171; text-transform: capitalize; font-size: 13px; }
  h2 { margin-top: 8px; font-size: 26px; }
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const PrimaryButton = styled.button`
  padding: 12px 20px;
  background: #d45b3f;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
  &:hover { background: #b9472e; }
`;

const PlainButton = styled.button`
  padding: 10px 16px;
  border: 1px solid #23231f;
  font-weight: 700;
  &:hover { background: #23231f; color: #fff; }
`;

const DangerButton = styled.button`
  color: #a3291b;
  font-weight: 700;
  &:hover { text-decoration: underline; }
`;

const formatAddress = (address) => {
  if (!address || address === "Default Address") return "No address provided";
  if (typeof address === "string") return address;
  return [address.street, address.city, address.state, address.postal, address.country].filter(Boolean).join(", ");
};

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  withCredentials: true,
});
const errorMessage = (error, fallback) => error.response?.data?.message || fallback;

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: "", discountPercent: 10 });
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [stockDrafts, setStockDrafts] = useState({});
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = { orders: "orders", inventory: "products", customers: "customers", coupons: "coupons" }[activeTab] || "analytics";
      const res = await axios.get(`${API_BASE_URL}/api/admin/${endpoint}`, authConfig());
      const data = res.data.data;
      if (activeTab === "orders") setOrders(data);
      else if (activeTab === "inventory") { setProducts(data); setStockDrafts({}); }
      else if (activeTab === "customers") setCustomers(data);
      else if (activeTab === "coupons") setCoupons(data);
      else setAnalytics(data);
    } catch (error) {
      toast.error(errorMessage(error, "Access denied. Please sign in as an admin."));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const visibleProducts = useMemo(() => {
    const list = lowStockOnly ? products.filter((product) => Number(product.stock || 0) <= LOW_STOCK) : products;
    return [...list].sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
  }, [products, lowStockOnly]);

  const handleUpdateOrderStatus = async (order, status) => {
    if (CLOSED_STATUSES.includes(status) && !window.confirm(`Mark this order as ${status}? Its items go back into stock and the order is closed.`)) return;
    try {
      await axios.patch(`${API_BASE_URL}/api/admin/orders/${order.id}`, { status }, authConfig());
      toast.success(`Order marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update order"));
    }
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/admin/products`, {
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        sizes: newProduct.sizes.split("|").map((size) => size.trim()).filter(Boolean),
      }, authConfig());
      toast.success("Product added");
      setNewProduct(EMPTY_PRODUCT);
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to add product"));
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/products/${product.id}`, authConfig());
      toast.success("Product removed");
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete product"));
    }
  };

  const handleSaveStock = async (product) => {
    const stock = Number(stockDrafts[product.id]);
    if (!Number.isInteger(stock) || stock < 0) return toast.error("Stock must be a whole number of 0 or more");
    try {
      await axios.put(`${API_BASE_URL}/api/admin/products/${product.id}`, { stock }, authConfig());
      toast.success(`Stock for ${product.title} set to ${stock}`);
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update stock"));
    }
  };

  const handleBulkImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let rows;
      if (file.name.endsWith(".json")) rows = JSON.parse(text);
      else {
        const [header, ...lines] = text.trim().split(/\r?\n/).map((line) => line.split(",").map((value) => value.trim()));
        rows = lines.map((line) => Object.fromEntries(header.map((key, index) => [key, line[index]])));
      }
      if (!Array.isArray(rows) || !rows.length) throw new Error("No products found");
      const results = await Promise.allSettled(rows.map((product) => axios.post(`${API_BASE_URL}/api/admin/products`, {
        ...product,
        price: Number(product.price),
        stock: Number(product.stock || 0),
        sizes: typeof product.sizes === "string" ? product.sizes.split("|") : product.sizes,
      }, authConfig())));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) toast.error(`${rows.length - failed} imported, ${failed} rejected (check title, price and stock)`);
      else toast.success(`${rows.length} products imported`);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Import failed");
    }
    event.target.value = "";
  };

  const handleAddCoupon = async (event) => {
    event.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/admin/coupons`, newCoupon, authConfig());
      setNewCoupon({ code: "", discountPercent: 10 });
      toast.success("Coupon created");
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, "Could not create coupon"));
    }
  };

  const handleDeleteCoupon = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/coupons/${coupon.id}`, authConfig());
      toast.success("Coupon deleted");
      fetchData();
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete coupon"));
    }
  };

  const setField = (key) => (event) => setNewProduct({ ...newProduct, [key]: event.target.value });

  const renderOrders = () => (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <strong>{order.order_no || order.id.substring(0, 8)}</strong>
                <div style={{ fontSize: 12, color: "#717171" }}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : order.order_date}</div>
              </td>
              <td style={{ maxWidth: 240 }}>
                <strong>{order.userEmail || order.paymentDetails?.customerName || "Guest"}</strong>
                <div style={{ fontSize: 12, color: "#5f5c55", marginTop: 4 }}>{order.phone || "No phone"}</div>
                <div style={{ fontSize: 12, color: "#5f5c55", marginTop: 2 }}>{formatAddress(order.shippingAddress)}</div>
              </td>
              <td style={{ fontSize: 13 }}>
                {(order.items || []).map((item, index) => <div key={index}>{item.quantity} × {item.title || item.name}</div>)}
              </td>
              <td><strong>{currencyFormat(order.totalAmount || 0)}</strong></td>
              <td style={{ fontSize: 13 }}>
                {order.paymentDetails?.paymentType || order.paymentMethod || "—"}
                <div style={{ fontSize: 12, color: "#717171", fontFamily: "monospace" }}>{order.paymentDetails?.transactionId || ""}</div>
              </td>
              <td>
                <div style={{ marginBottom: 8 }}><Badge $status={order.status}>{order.status}</Badge></div>
                <Select
                  value={ORDER_STATUSES.includes(order.status) ? order.status : ""}
                  disabled={CLOSED_STATUSES.includes(order.status)}
                  onChange={(event) => handleUpdateOrderStatus(order, event.target.value)}
                  aria-label={`Change status of order ${order.order_no || order.id}`}
                >
                  {!ORDER_STATUSES.includes(order.status) && <option value="" disabled>{order.status}</option>}
                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </Select>
              </td>
            </tr>
          ))}
          {!orders.length && !loading && <tr><td colSpan="6">No orders yet.</td></tr>}
        </tbody>
      </Table>
    </TableScroll>
  );

  const renderInventory = () => (
    <>
      <h3>Add a product</h3>
      <Form onSubmit={handleAddProduct}>
        <label>Title<Input value={newProduct.title} onChange={setField("title")} required /></label>
        <label>Brand<Input value={newProduct.brand} onChange={setField("brand")} required /></label>
        <label>Price (₹)<Input type="number" min="1" step="1" value={newProduct.price} onChange={setField("price")} required /></label>
        <label>Opening stock<Input type="number" min="0" step="1" value={newProduct.stock} onChange={setField("stock")} required /></label>
        <label>Category
          <Select value={newProduct.category} onChange={setField("category")}>
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </Select>
        </label>
        <label>Shop for
          <Select value={newProduct.gender} onChange={setField("gender")}>
            {GENDERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </label>
        <label>Sizes (separate with |)<Input value={newProduct.sizes} onChange={setField("sizes")} placeholder="S|M|L|XL or 7|8|9" /></label>
        <label>Image URL<Input value={newProduct.imgSource} onChange={setField("imgSource")} required /></label>
        <PrimaryButton type="submit" className="full">Add product</PrimaryButton>
      </Form>

      <Toolbar>
        <h3 style={{ margin: 0 }}>Stock ({visibleProducts.length})</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
            <input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
            Only {LOW_STOCK} or fewer left
          </label>
          <PlainButton as="label" style={{ cursor: "pointer" }}>
            <i className="bi bi-upload"></i> Bulk import JSON/CSV
            <input type="file" accept=".json,.csv" hidden onChange={handleBulkImport} />
          </PlainButton>
        </div>
      </Toolbar>
      <TableScroll>
        <Table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>In stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => {
              const draft = stockDrafts[product.id];
              const dirty = draft !== undefined && String(draft) !== String(product.stock);
              const genderLabel = (GENDERS.find(([value]) => value === product.gender) || [null, product.gender])[1];
              return (
                <tr key={product.id} className={Number(product.stock || 0) <= LOW_STOCK ? "low" : ""}>
                  <td>
                    <strong>{product.title}</strong>
                    <div style={{ fontSize: 12, color: "#717171" }}>{product.brand}</div>
                  </td>
                  <td>{product.category}{genderLabel ? ` · ${genderLabel}` : ""}</td>
                  <td>{currencyFormat(product.price)}</td>
                  <td>
                    <form
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                      onSubmit={(event) => { event.preventDefault(); handleSaveStock(product); }}
                    >
                      <StockInput
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`Stock for ${product.title}`}
                        value={draft ?? product.stock ?? 0}
                        onChange={(event) => setStockDrafts({ ...stockDrafts, [product.id]: event.target.value })}
                      />
                      {dirty && <PlainButton type="submit" style={{ padding: "7px 12px" }}>Save</PlainButton>}
                    </form>
                  </td>
                  <td><DangerButton onClick={() => handleDeleteProduct(product)}>Delete</DangerButton></td>
                </tr>
              );
            })}
            {!visibleProducts.length && !loading && <tr><td colSpan="5">Nothing to show.</td></tr>}
          </tbody>
        </Table>
      </TableScroll>
    </>
  );

  const renderCoupons = () => (
    <>
      <Form onSubmit={handleAddCoupon}>
        <label>Coupon code<Input value={newCoupon.code} onChange={(event) => setNewCoupon({ ...newCoupon, code: event.target.value.toUpperCase() })} required /></label>
        <label>Discount (%)<Input type="number" min="1" max="80" value={newCoupon.discountPercent} onChange={(event) => setNewCoupon({ ...newCoupon, discountPercent: Number(event.target.value) })} required /></label>
        <PrimaryButton type="submit" className="full">Create coupon</PrimaryButton>
      </Form>
      <Table>
        <thead><tr><th>Code</th><th>Discount</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id}>
              <td><strong>{coupon.code}</strong></td>
              <td>{coupon.discountPercent}%</td>
              <td>{coupon.active === false ? "Inactive" : "Active"}</td>
              <td><DangerButton onClick={() => handleDeleteCoupon(coupon)}>Delete</DangerButton></td>
            </tr>
          ))}
          {!coupons.length && !loading && <tr><td colSpan="4">No coupons yet.</td></tr>}
        </tbody>
      </Table>
    </>
  );

  const renderCustomers = () => (
    <TableScroll>
      <Table>
        <thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.firstName} {customer.lastName}</td>
              <td>{customer.email}</td>
              <td>{customer.phoneNumber || "—"}</td>
              <td>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableScroll>
  );

  const renderAnalytics = () => analytics && (
    <StatGrid>
      {Object.entries(analytics).map(([key, value]) => (
        <div key={key}>
          <span>{key === "lowStock" ? `Low stock (≤${LOW_STOCK})` : key.replace(/([A-Z])/g, " $1")}</span>
          <h2>{key === "revenue" ? currencyFormat(value) : value}</h2>
        </div>
      ))}
    </StatGrid>
  );

  const tabs = [["orders", "Orders"], ["inventory", "Stock & inventory"], ["analytics", "Analytics"], ["customers", "Customers"], ["coupons", "Coupons"]];
  const content = { orders: renderOrders, inventory: renderInventory, analytics: renderAnalytics, customers: renderCustomers, coupons: renderCoupons }[activeTab];

  return (
    <AdminWrapper>
      <Container>
        <AdminHeader>
          <h1>Admin console</h1>
          <PrimaryButton as="a" href="/">View site</PrimaryButton>
        </AdminHeader>

        <TabContainer role="tablist">
          {tabs.map(([key, label]) => (
            <Tab key={key} role="tab" aria-selected={activeTab === key} $active={activeTab === key} onClick={() => setActiveTab(key)}>{label}</Tab>
          ))}
        </TabContainer>

        {loading && <p style={{ marginBottom: 16, color: "#717171" }}>Loading…</p>}
        {content()}
      </Container>
    </AdminWrapper>
  );
};

export default AdminDashboard;
