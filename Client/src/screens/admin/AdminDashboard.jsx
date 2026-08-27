import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Container } from "../../styles/styles";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";
import { toast } from "react-hot-toast";
import { currencyFormat } from "../../utils/helper";
import OrderStatusTracker from "../../components/common/OrderStatusTracker";

const AdminWrapper = styled.div`
  padding: 40px 0;
  background: #f7f5ef;
  min-height: 100vh;
`;

const AdminHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
`;

const Tab = styled.button`
  padding: 10px 20px;
  border: none;
  background: ${props => props.active ? "#d45b3f" : "#fff"};
  color: ${props => props.active ? "#fff" : "#333"};
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  border: 1px solid ${props => props.active ? "#d45b3f" : "#dedbd3"};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);

  th, td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    background: #f8f9fa;
    font-weight: 600;
  }
`;

const Badge = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  background: ${props => {
    switch(props.status) {
      case 'Delivered': return '#e6fffa';
      case 'inprogress': return '#fffaf0';
      case 'Cancelled': return '#fff5f5';
      default: return '#f7fafc';
    }
  }};
  color: ${props => {
    switch(props.status) {
      case 'Delivered': return '#38b2ac';
      case 'inprogress': return '#ed8936';
      case 'Cancelled': return '#e53e3e';
      default: return '#4a5568';
    }
  }};
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 30px;
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState("orders");
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const [newCoupon, setNewCoupon] = useState({ code:"", discountPercent:10 });
    const [loading, setLoading] = useState(false);

    // Form states for adding/editing products
    const [newProduct, setNewProduct] = useState({ title: "", brand: "", price: "", stock: 10, imgSource: "" });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const config = {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            };

            if (activeTab === "orders") {
                const res = await axios.get(`${API_BASE_URL}/api/admin/orders`, config);
                setOrders(res.data.data);
            } else if (activeTab === "inventory") {
                const res = await axios.get(`${API_BASE_URL}/api/admin/products`, config);
                setProducts(res.data.data);
            } else if (activeTab === "customers") {
                const res = await axios.get(`${API_BASE_URL}/api/admin/customers`, config);
                setCustomers(res.data.data);
            } else if (activeTab === "coupons") {
                const res = await axios.get(`${API_BASE_URL}/api/admin/coupons`, config);
                setCoupons(res.data.data);
            } else {
                const res = await axios.get(`${API_BASE_URL}/api/admin/analytics`, config);
                setAnalytics(res.data.data);
            }
        } catch (error) {
            toast.error("Access Denied. Please ensure you are logged in as Admin.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateOrderStatus = async (id, status) => {
        try {
            const token = localStorage.getItem("accessToken");
            await axios.patch(`${API_BASE_URL}/api/admin/orders/${id}`, 
                { status }, 
                { 
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true 
                }
            );
            toast.success("Order status updated!");
            fetchData();
        } catch (error) {
            toast.error("Failed to update order");
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("accessToken");
            await axios.post(`${API_BASE_URL}/api/admin/products`, newProduct, { 
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true 
            });
            toast.success("Product added to stock!");
            setNewProduct({ title: "", brand: "", price: "", stock: 10, imgSource: "" });
            fetchData();
        } catch (error) {
            toast.error("Failed to add product");
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            const token = localStorage.getItem("accessToken");
            await axios.delete(`${API_BASE_URL}/api/admin/products/${id}`, { 
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true 
            });
            toast.success("Product removed!");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete product");
        }
    };

    const handleUpdateProductStock = async (id, currentStock, increment) => {
        try {
            const token = localStorage.getItem("accessToken");
            const newStock = Math.max(0, parseInt(currentStock || 0) + increment);
            await axios.put(`${API_BASE_URL}/api/admin/products/${id}`, 
                { stock: newStock }, 
                { 
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true 
                }
            );
            toast.success("Product stock updated!");
            fetchData();
        } catch (error) {
            toast.error("Failed to update stock");
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
            const token = localStorage.getItem("accessToken");
            await Promise.all(rows.map((product) => axios.post(`${API_BASE_URL}/api/admin/products`, { ...product, price:Number(product.price), stock:Number(product.stock || 0), sizes:typeof product.sizes === "string" ? product.sizes.split("|") : product.sizes }, { headers:{ Authorization:`Bearer ${token}` } })));
            toast.success(`${rows.length} products imported`);
            fetchData();
        } catch (error) { toast.error(error.message || "Import failed"); }
        event.target.value = "";
    };

    const handleAddCoupon = async (event) => {
        event.preventDefault();
        try { const token=localStorage.getItem("accessToken"); await axios.post(`${API_BASE_URL}/api/admin/coupons`,newCoupon,{headers:{Authorization:`Bearer ${token}`}}); setNewCoupon({code:"",discountPercent:10}); toast.success("Coupon created"); fetchData(); } catch(error){ toast.error(error.response?.data?.message||"Could not create coupon"); }
    };
    const handleDeleteCoupon = async (id) => { try { const token=localStorage.getItem("accessToken"); await axios.delete(`${API_BASE_URL}/api/admin/coupons/${id}`,{headers:{Authorization:`Bearer ${token}`}}); toast.success("Coupon deleted"); fetchData(); } catch { toast.error("Could not delete coupon"); } };

    return (
        <AdminWrapper>
            <Container>
                <AdminHeader>
                    <h1>Admin Management Console</h1>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/'}>View Site</button>
                </AdminHeader>

                <TabContainer>
                    <Tab active={activeTab === "orders"} onClick={() => setActiveTab("orders")}>Order Management</Tab>
                    <Tab active={activeTab === "inventory"} onClick={() => setActiveTab("inventory")}>Stock & Inventory</Tab>
                    <Tab active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")}>Analytics</Tab>
                    <Tab active={activeTab === "customers"} onClick={() => setActiveTab("customers")}>Customers</Tab>
                    <Tab active={activeTab === "coupons"} onClick={() => setActiveTab("coupons")}>Coupons</Tab>
                </TabContainer>

                {activeTab === "analytics" ? (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:18}}>{analytics && Object.entries(analytics).map(([key,value]) => <div key={key} style={{background:"#fff",border:"1px solid #dedbd3",borderRadius:14,padding:22}}><span style={{color:"#717171",textTransform:"capitalize"}}>{key.replace(/([A-Z])/g," $1")}</span><h2 style={{marginTop:8}}>{key === "revenue" ? currencyFormat(value) : value}</h2></div>)}</div>
                ) : activeTab === "customers" ? (
                    <Table><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead><tbody>{customers.map((customer)=><tr key={customer.id}><td>{customer.firstName} {customer.lastName}</td><td>{customer.email}</td><td>{customer.phoneNumber || "—"}</td><td>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></Table>
                ) : activeTab === "coupons" ? (
                    <><Form onSubmit={handleAddCoupon}><Input placeholder="Coupon code" value={newCoupon.code} onChange={(e)=>setNewCoupon({...newCoupon,code:e.target.value.toUpperCase()})} required/><Input type="number" min="1" max="80" value={newCoupon.discountPercent} onChange={(e)=>setNewCoupon({...newCoupon,discountPercent:Number(e.target.value)})} required/><button className="btn btn-purple" type="submit" style={{gridColumn:"span 2"}}>Create coupon</button></Form><Table><thead><tr><th>Code</th><th>Discount</th><th>Status</th><th></th></tr></thead><tbody>{coupons.map((coupon)=><tr key={coupon.id}><td><strong>{coupon.code}</strong></td><td>{coupon.discountPercent}%</td><td>{coupon.active===false?"Inactive":"Active"}</td><td>{!String(coupon.id).startsWith("welcome")&&!String(coupon.id).startsWith("style")&&<button onClick={()=>handleDeleteCoupon(coupon.id)} style={{color:"#b42318"}}>Delete</button>}</td></tr>)}</tbody></Table></>
                ) : activeTab === "orders" ? (
                    <Table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer Details</th>
                                <th>Transaction ID</th>
                                <th>Payment Type</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td>
                                        <div style={{fontWeight: 'bold'}}>{order.order_no || order.id.substring(0, 8)}</div>
                                        <div style={{fontSize: '11px', color: '#888'}}>{order.id}</div>
                                    </td>
                                    <td>
                                        <div style={{fontWeight: '600', color: '#333'}}>
                                            {order.userEmail || order.paymentDetails?.customerName || "Guest"}
                                        </div>
                                        <div style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
                                            <i className="bi bi-telephone-fill" style={{marginRight: '6px'}}></i>
                                            {order.phone || "N/A"}
                                        </div>
                                        <div style={{fontSize: '12px', color: '#666', marginTop: '2px', maxWidth: '200px'}}>
                                            <i className="bi bi-geo-alt-fill" style={{marginRight: '6px'}}></i>
                                            {order.shippingAddress && order.shippingAddress !== "Default Address" ? order.shippingAddress : "No Address Provided"}
                                        </div>
                                    </td>
                                    <td><code style={{background: '#f0f0f0', padding: '2px 5px', borderRadius: '4px'}}>{order.paymentDetails?.transactionId || "N/A"}</code></td>
                                    <td>{order.paymentDetails?.paymentType || order.paymentMethod}</td>
                                    <td>{order.order_date}</td>
                                    <td style={{ minWidth: '300px' }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <Badge status={order.status}>{order.status}</Badge>
                                        </div>
                                        {order.status !== "Cancelled" && (
                                            <OrderStatusTracker currentStatus={order.status} compact={true} />
                                        )}
                                    </td>
                                    <td>
                                        <select 
                                            value={order.status} 
                                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                            style={{padding: '5px', borderRadius: '4px'}}
                                        >
                                            <option value="Order Placed">Order Placed</option>
                                            <option value="Shipped">Shipped</option>
                                            <option value="Out for delivery">Out for delivery</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <>
                        <h3 style={{marginBottom: '20px'}}>Add New Stock Item</h3>
                        <label style={{display:"inline-flex",alignItems:"center",gap:8,border:"1px solid #263333",borderRadius:999,padding:"10px 16px",fontWeight:700,cursor:"pointer",marginBottom:20}}><i className="bi bi-upload"></i> Bulk import JSON/CSV<input type="file" accept=".json,.csv" hidden onChange={handleBulkImport}/></label>
                        <Form onSubmit={handleAddProduct}>
                            <Input placeholder="Product Title" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} required />
                            <Input placeholder="Brand" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} required />
                            <Input type="number" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                            <Input type="number" placeholder="Initial Stock" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} required />
                            <Input placeholder="Image URL" value={newProduct.imgSource} onChange={e => setNewProduct({...newProduct, imgSource: e.target.value})} required />
                            <button type="submit" className="btn btn-purple" style={{gridColumn: 'span 2'}}>Add to Inventory</button>
                        </Form>

                        <Table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Brand</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product.id}>
                                        <td>{product.title}</td>
                                        <td>{product.brand}</td>
                                        <td>{currencyFormat(product.price)}</td>
                                        <td>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                <button onClick={() => handleUpdateProductStock(product.id, product.stock, -1)} style={{padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', background: '#f9f9f9'}}>-</button>
                                                <span>{product.stock || 0}</span>
                                                <button onClick={() => handleUpdateProductStock(product.id, product.stock, 1)} style={{padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', background: '#f9f9f9'}}>+</button>
                                            </div>
                                        </td>
                                        <td>
                                            <button onClick={() => handleDeleteProduct(product.id)} style={{color: 'red', border: 'none', background: 'none', cursor: 'pointer'}}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                )}
            </Container>
        </AdminWrapper>
    );
};

export default AdminDashboard;
