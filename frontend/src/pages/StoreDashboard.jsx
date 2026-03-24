import { useState, useEffect } from "react";

export default function StoreDashboard() {
  const [activeTab, setActiveTab] = useState("Hồ sơ");

  // ==========================================
  // 1. STATE & API: THÔNG TIN HỒ SƠ & SẢN PHẨM
  // ==========================================
  const [storeInfo, setStoreInfo] = useState({
    storeName: "", phone: "", address: "", description: "", openTime: "", closeTime: ""
  });
  const [products, setProducts] = useState([]);

  // Tự động tải dữ liệu từ DB lên
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData && userData.id) {
      // Tải Hồ sơ
      fetch(`http://localhost:5000/api/stores/profile/${userData.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setStoreInfo({
              storeName: data.store_name || "", phone: data.phone || "", address: data.address || "",
              description: data.description || "", openTime: data.open_time || "", closeTime: data.close_time || ""
            });
          }
        })
        .catch((err) => console.error("Lỗi tải hồ sơ:", err));

      // Tải Sản phẩm
      fetch(`http://localhost:5000/api/products/${userData.id}`)
        .then((res) => res.json())
        .then((data) => setProducts(data))
        .catch((err) => console.error("Lỗi tải sản phẩm:", err));
    }
  }, []);

  const handleInputChange = (e) => setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || !userData.id) return alert("Lỗi: Không tìm thấy ID tài khoản!");

    try {
      const response = await fetch("http://localhost:5000/api/stores/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData.id, storeName: storeInfo.storeName, phone: storeInfo.phone,
          address: storeInfo.address, description: storeInfo.description, openTime: storeInfo.openTime, closeTime: storeInfo.closeTime
        }),
      });
      const data = await response.json();
      if (response.ok) alert("✅ Đã lưu thông tin hồ sơ cửa hàng thành công!");
      else alert("❌ Lỗi từ Database: " + (data.error || "Không rõ nguyên nhân"));
    } catch (error) {
      alert("❌ Lỗi mạng: Không thể kết nối đến máy chủ Backend!");
    }
  };

  // ==========================================
  // 2. STATE: QUẢN LÝ YÊU CẦU & TIẾN ĐỘ
  // ==========================================
  const [requests, setRequests] = useState([
    { 
      id: 1, customer: "Nguyễn Văn A", device: "Laptop Dell XPS", issue: "Màn hình bị sọc", status: "PENDING",
      detail: { 
        deviceType: "Laptop", brand: "Dell", model: "Dell XPS 15 9500", title: "Màn hình sọc xanh và cảm ứng chậm", 
        categories: ["Màn hình", "Cảm ứng"], description: "Máy đang dùng bình thường thì tự nhiên xuất hiện sọc ngang.",
        receiveMethod: "Mang đến cửa hàng", budget: "1.500.000", desiredDate: "20/03/2026", phone: "0912345678", address: "Tự mang tới cửa hàng"
      }
    },
    { 
      id: 2, customer: "Trần Thị B", device: "iPhone 13 Pro", issue: "Pin chai", status: "PENDING",
      detail: { 
        deviceType: "Điện thoại", brand: "Apple", model: "iPhone 13 Pro 256GB", title: "Pin tụt nhanh, máy nóng", 
        categories: ["Pin", "Tản nhiệt"], description: "Sạc đầy 100% dùng được cỡ 2 tiếng là hết pin.",
        receiveMethod: "Nhận tận nơi", budget: "800.000", desiredDate: "18/03/2026", phone: "0987654321", address: "45 Lê Duẩn, Hải Châu, Đà Nẵng"
      }
    },
    { 
      id: 3, customer: "Lê Văn C", device: "MacBook Air M1", issue: "Cài lại MacOS", status: "IN_PROGRESS",
      detail: { 
        deviceType: "Laptop", brand: "Apple", model: "MacBook Air M1 2020", title: "Cần cài lại MacOS trắng", 
        categories: ["Nguồn"], description: "Máy bị dính mã độc tống tiền, cần format toàn bộ.",
        receiveMethod: "Kiểm tra tại chỗ", budget: "300.000", desiredDate: "17/03/2026", phone: "0905112233", address: "Quán Cafe The Cup"
      }
    },
  ]);

  const [selectedRequest, setSelectedRequest] = useState(null);

  const handleAccept = (id) => {
    setRequests(requests.map(req => req.id === id ? { ...req, status: "IN_PROGRESS" } : req));
    setSelectedRequest(null); 
    alert("✅ Đã nhận đơn! Yêu cầu này đã được chuyển sang tab Tiến độ sửa chữa.");
  };

  const handleReject = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) {
      setRequests(requests.filter(req => req.id !== id));
      setSelectedRequest(null); 
    }
  };

  const handleComplete = (id) => {
    setRequests(requests.map(req => req.id === id ? { ...req, status: "COMPLETED" } : req));
    alert("🎉 Đã hoàn thành sửa chữa! Khách hàng sẽ nhận được thông báo.");
  };

  // ==========================================
  // 3. API: THÊM / XÓA SẢN PHẨM DỊCH VỤ
  // ==========================================
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", type: "Dịch vụ", price: "", image: "" });

  // Xử lý khi user chọn file ảnh từ máy tính
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result }); // Lưu ảnh dưới dạng mã Base64
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || !userData.id) return alert("Lỗi đăng nhập!");
    if (!newProduct.name || !newProduct.price) return alert("Vui lòng nhập Tên và Giá!");

    try {
      const res = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userData.id, ...newProduct })
      });
      const data = await res.json();
      
      if (res.ok) {
        setProducts([{ id: data.id, ...newProduct }, ...products]);
        setNewProduct({ name: "", type: "Dịch vụ", price: "", image: "" });
        setShowAddForm(false);
        alert("✅ Đã thêm mặt hàng mới!");
      } else {
        alert("❌ Lỗi Database: " + data.error);
      }
    } catch (err) {
      alert("❌ Lỗi kết nối mạng!");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa mặt hàng này khỏi cửa hàng?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/products/${id}`, { method: "DELETE" });
        if (res.ok) {
          setProducts(products.filter(p => p.id !== id));
        } else {
          alert("❌ Có lỗi xảy ra khi xóa.");
        }
      } catch (err) {
        alert("❌ Lỗi kết nối mạng!");
      }
    }
  };

  // ==========================================
  // MENU ITEMS CỦA STORE
  // ==========================================
  const menuItems = [
    { id: "Hồ sơ", title: "Hồ sơ", subtitle: "Tài khoản và cài đặt", icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
    { id: "Yêu cầu", title: "Yêu cầu sửa chữa", subtitle: "Chờ phê duyệt", icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg> },
    { id: "Tiến độ", title: "Tiến độ sửa chữa", subtitle: "Cập nhật trạng thái", icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg> },
    { id: "Gói quảng bá", title: "Gói quảng bá", subtitle: "Nâng cấp hiển thị", icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385c.148.621-.531 1.05-1.015.809l-4.73-2.365a.563.563 0 0 0-.528 0l-4.73 2.365c-.484.24-1.163-.188-1.015-.809l1.285-5.385a.563.563 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 0-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg> },
    { id: "Sản phẩm", title: "Sản phẩm & Dịch vụ", subtitle: "Quản lý danh mục", icon: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
  ];

  const CheckIcon = ({ color = "#10b981" }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke={color} style={{ width: "16px", height: "16px", marginRight: "8px", flexShrink: 0, marginTop: "2px" }}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>;

  const inputStyle = {
    width: "100%", padding: "12px", borderRadius: "8px", 
    border: "1px solid #cbd5e1", backgroundColor: "#ffffff", 
    color: "#0f172a", outline: "none", fontSize: "15px", boxSizing: "border-box"
  };

  const detailInputStyle = {
    width: "100%", padding: "14px", borderRadius: "12px", 
    border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", 
    color: "#334155", outline: "none", fontSize: "15px", boxSizing: "border-box", marginTop: "8px"
  };

  const labelStyle = { display: "block", fontWeight: "bold", color: "#0f172a", fontSize: "15px" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "Inter, sans-serif", position: "relative" }}>
      
      {/* ===== MENU BÊN TRÁI ===== */}
      <div style={{ width: "280px", backgroundColor: "#0f172a", color: "white", padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px', padding: '0 8px' }}>
            <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, #60a5fa, #2563eb)', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)' }}>
                IEMS
            </div>
            <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'white', letterSpacing: "0.5px" }}>Store Portal</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Nền tảng sửa chữa thiết bị</p>
            </div>
        </div>

        <p style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", margin: "0 0 16px 12px", letterSpacing: "1px", textTransform: "uppercase" }}>ĐIỀU HƯỚNG</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderRadius: "12px", cursor: "pointer", backgroundColor: isActive ? "rgba(30, 41, 59, 0.8)" : "transparent", border: isActive ? "1px solid rgba(51, 65, 85, 0.8)" : "1px solid transparent", transition: "all 0.2s ease" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: isActive ? "#3b82f6" : "#1e293b", color: isActive ? "white" : "#94a3b8", marginRight: "16px", boxShadow: isActive ? "0 4px 10px rgba(59, 130, 246, 0.3)" : "none" }}>{item.icon}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "14px", fontWeight: isActive ? "700" : "500", color: isActive ? "white" : "#cbd5e1" }}>{item.title}</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: isActive ? "#94a3b8" : "#64748b" }}>{item.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== KHU VỰC NỘI DUNG CHÍNH ===== */}
      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        
        {/* TAB 1: HỒ SƠ */}
        {activeTab === "Hồ sơ" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>Trang hồ sơ và cài đặt</h1>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>Quản lý thông tin và thiết lập hiển thị của cửa hàng.</p>
            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
              <div style={{ width: "320px", backgroundColor: "white", borderRadius: "16px", padding: "32px 24px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ width: "100px", height: "100px", backgroundColor: "#3b82f6", color: "white", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "36px", fontWeight: "bold", margin: "0 auto 20px auto", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)" }}>TM</div>
                <h2 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "20px" }}>{storeInfo.storeName || "Tên cửa hàng"}</h2>
                <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "14px" }}>Cửa hàng đối tác IEMS</p>
                <p style={{ margin: "0 0 24px 0", color: "#94a3b8", fontSize: "13px" }}>Tham gia từ 2026</p>
                <div style={{ textAlign: "left", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "bold", color: "#0f172a", fontSize: "14px" }}>Số điện thoại hotline</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>{storeInfo.phone || "Đang cập nhật"}</p>
                </div>
              </div>
              <div style={{ flex: 1, backgroundColor: "white", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>Tên cửa hàng</label><input type="text" name="storeName" value={storeInfo.storeName} onChange={handleInputChange} style={inputStyle} /></div>
                  <div style={{ display: "flex", gap: "20px" }}>
                    <div style={{ flex: 1 }}><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>Số điện thoại</label><input type="text" name="phone" value={storeInfo.phone} onChange={handleInputChange} style={inputStyle} /></div>
                    <div style={{ display: "flex", gap: "10px", flex: 1 }}>
                      <div style={{ flex: 1 }}><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>Giờ mở</label><input type="time" name="openTime" value={storeInfo.openTime} onChange={handleInputChange} style={inputStyle} /></div>
                      <div style={{ flex: 1 }}><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>Giờ đóng</label><input type="time" name="closeTime" value={storeInfo.closeTime} onChange={handleInputChange} style={inputStyle} /></div>
                    </div>
                  </div>
                  <div><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>Địa chỉ</label><input type="text" name="address" value={storeInfo.address} onChange={handleInputChange} style={inputStyle} /></div>
                  <div><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>Mô tả chuyên môn</label><textarea name="description" value={storeInfo.description} onChange={handleInputChange} rows="4" style={{...inputStyle, resize: "vertical"}} /></div>
                  <button type="submit" style={{ alignSelf: "flex-end", backgroundColor: "#2563eb", color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Lưu thay đổi</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: YÊU CẦU */}
        {activeTab === "Yêu cầu" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>Yêu cầu sửa chữa mới</h1>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>Danh sách khách hàng đang chờ bạn duyệt đơn.</p>
            <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead><tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}><th style={{ padding: "16px", color: "#475569" }}>Khách hàng</th><th style={{ padding: "16px", color: "#475569" }}>Thiết bị</th><th style={{ padding: "16px", color: "#475569" }}>Lỗi gặp phải</th><th style={{ padding: "16px", color: "#475569", textAlign: "center" }}>Hành động</th></tr></thead>
                <tbody>
                  {requests.filter(req => req.status === "PENDING").map(req => (
                    <tr key={req.id} onClick={() => setSelectedRequest(req)} style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer", transition: "background-color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: "16px", fontWeight: "bold", color: "#0f172a" }}>{req.customer}</td>
                      <td style={{ padding: "16px", color: "#334155" }}>{req.device}</td>
                      <td style={{ padding: "16px", color: "#ef4444" }}>{req.issue}</td>
                      <td style={{ padding: "16px", textAlign: "center" }} onClick={(e) => e.stopPropagation() }>
                        <button onClick={() => setSelectedRequest(req)} style={{ padding: "8px 16px", backgroundColor: "#f8fafc", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginRight: "8px" }}>Xem chi tiết</button>
                        <button onClick={() => handleAccept(req.id)} style={{ padding: "8px 16px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginRight: "8px" }}>Nhận đơn</button>
                        <button onClick={() => handleReject(req.id)} style={{ padding: "8px 16px", backgroundColor: "white", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Từ chối</button>
                      </td>
                    </tr>
                  ))}
                  {requests.filter(req => req.status === "PENDING").length === 0 && <tr><td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Không có yêu cầu mới nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TIẾN ĐỘ */}
        {activeTab === "Tiến độ" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>Tiến độ máy đang sửa</h1>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>Cập nhật trạng thái để khách hàng tiện theo dõi.</p>
            <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead><tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}><th style={{ padding: "16px", color: "#475569" }}>Khách hàng</th><th style={{ padding: "16px", color: "#475569" }}>Thiết bị</th><th style={{ padding: "16px", color: "#475569" }}>Trạng thái</th><th style={{ padding: "16px", color: "#475569", textAlign: "center" }}>Cập nhật</th></tr></thead>
                <tbody>
                  {requests.filter(req => req.status === "IN_PROGRESS" || req.status === "COMPLETED").map(req => (
                    <tr key={req.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "16px", fontWeight: "bold", color: "#0f172a" }}>{req.customer}</td><td style={{ padding: "16px", color: "#334155" }}>{req.device}</td>
                      <td style={{ padding: "16px" }}>
                        {req.status === "IN_PROGRESS" ? <span style={{ padding: "6px 12px", backgroundColor: "#fef3c7", color: "#d97706", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>Đang sửa chữa ⚙️</span> : <span style={{ padding: "6px 12px", backgroundColor: "#d1fae5", color: "#059669", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>Đã hoàn thành ✅</span>}
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        {req.status === "IN_PROGRESS" ? ( <button onClick={() => handleComplete(req.id)} style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Báo hoàn thành</button> ) : ( <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "bold" }}>Đã bàn giao</span> )}
                      </td>
                    </tr>
                  ))}
                  {requests.filter(req => req.status !== "PENDING").length === 0 && <tr><td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Chưa có máy nào đang sửa.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: GÓI QUẢNG BÁ */}
        {activeTab === "Gói quảng bá" && (
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>Gói hiển thị cửa hàng</h1>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>Nâng cấp quyền lợi để tiếp cận hàng ngàn khách hàng trên hệ thống IEMS.</p>
            <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: "20px", padding: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.4)", border: "1px solid #334155" }}>
              <div>
                <span style={{ backgroundColor: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px", border: "1px solid rgba(251, 191, 36, 0.3)" }}>GÓI HIỆN TẠI CỦA BẠN</span>
                <h2 style={{ margin: "16px 0 8px 0", fontSize: "32px", color: "white", display: "flex", alignItems: "center", gap: "12px" }}>
                  <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: "36px", height: "36px", color: "#fbbf24" }}><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" /></svg>
                  Đối Tác Chiến Lược
                </h2>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "15px" }}>Được cấp bởi Admin • Tự động gia hạn</p>
              </div>
              <div style={{ textAlign: "right" }}><button style={{ backgroundColor: "#fbbf24", color: "#0f172a", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: "bold", fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 14px rgba(251, 191, 36, 0.4)" }}>Liên hệ Admin</button></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
              <div style={{ backgroundColor: "white", borderRadius: "20px", padding: "32px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", position: "relative" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#64748b", fontSize: "18px", fontWeight: "bold" }}>Top Search</h3><div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginBottom: "24px" }}>Ưu tiên hiển thị</div><div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "20px 0" }}></div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px", color: "#475569", fontSize: "15px" }}>
                  <li style={{ display: "flex" }}><CheckIcon /> Tên cửa hàng lên top tìm kiếm</li><li style={{ display: "flex" }}><CheckIcon /> Hiển thị ngẫu nhiên trên Trang chủ</li><li style={{ display: "flex", color: "#cbd5e1" }}><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" style={{ width: "16px", height: "16px", marginRight: "8px", flexShrink: 0, marginTop: "2px" }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg> Huy hiệu Xác thực</li>
                </ul>
                <button style={{ width: "100%", marginTop: "32px", padding: "12px", borderRadius: "10px", backgroundColor: "#f1f5f9", color: "#64748b", fontWeight: "bold", border: "none", cursor: "not-allowed" }}>Chưa kích hoạt</button>
              </div>
              <div style={{ backgroundColor: "white", borderRadius: "20px", padding: "32px", border: "2px solid #3b82f6", boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.15)", position: "relative" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#3b82f6", fontSize: "18px", fontWeight: "bold" }}>Verified Store</h3><div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginBottom: "24px" }}>Cửa hàng Uy tín</div><div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "20px 0" }}></div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px", color: "#475569", fontSize: "15px" }}>
                  <li style={{ display: "flex" }}><CheckIcon color="#3b82f6" /> Lọc riêng trong mục "Cửa hàng uy tín"</li><li style={{ display: "flex" }}><CheckIcon color="#3b82f6" /> Gắn huy hiệu Xác thực xanh</li><li style={{ display: "flex" }}><CheckIcon color="#3b82f6" /> Đăng tải không giới hạn hình ảnh</li>
                </ul>
                <button style={{ width: "100%", marginTop: "32px", padding: "12px", borderRadius: "10px", backgroundColor: "white", color: "#3b82f6", border: "2px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }}>Đăng ký gói này</button>
              </div>
              <div style={{ backgroundColor: "#fffbeb", borderRadius: "20px", padding: "32px", border: "2px solid #fbbf24", boxShadow: "0 10px 25px -5px rgba(251, 191, 36, 0.2)", position: "relative" }}>
                <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#fbbf24", color: "#0f172a", padding: "4px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>ĐANG SỬ DỤNG</div>
                <h3 style={{ margin: "0 0 8px 0", color: "#d97706", fontSize: "18px", fontWeight: "bold" }}>Premium Partner</h3><div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginBottom: "24px" }}>Đối tác Chiến lược</div><div style={{ height: "1px", backgroundColor: "#fde68a", margin: "20px 0" }}></div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px", color: "#475569", fontSize: "15px" }}>
                  <li style={{ display: "flex" }}><CheckIcon color="#d97706" /> Bao gồm tất cả quyền lợi Gói Uy tín</li><li style={{ display: "flex" }}><CheckIcon color="#d97706" /> Đứng Top 1 vĩnh viễn khu vực lân cận</li><li style={{ display: "flex" }}><CheckIcon color="#d97706" /> Nhắn tin ưu đãi đến toàn bộ User</li><li style={{ display: "flex" }}><CheckIcon color="#d97706" /> Viền phát sáng nổi bật trên Bản đồ</li>
                </ul>
                <button style={{ width: "100%", marginTop: "32px", padding: "12px", borderRadius: "10px", backgroundColor: "#fbbf24", color: "#0f172a", fontWeight: "bold", border: "none", boxShadow: "0 4px 10px rgba(251, 191, 36, 0.3)" }}>Đang kích hoạt</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SẢN PHẨM (MỚI: Có NÚT CHỌN ẢNH TỪ MÁY TÍNH) */}
        {activeTab === "Sản phẩm" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
              <div><h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>Kho Sản phẩm & Dịch vụ</h1><p style={{ color: "#64748b", margin: 0 }}>Thêm/xóa các mặt hàng kinh doanh.</p></div>
              <button onClick={() => setShowAddForm(!showAddForm)} style={{ backgroundColor: "#2563eb", color: "white", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>{showAddForm ? "Đóng form" : "+ Thêm mặt hàng mới"}</button>
            </div>

            {showAddForm && (
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
                <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>Tên mặt hàng</label><input type="text" placeholder="VD: Thay pin iPhone..." value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} style={inputStyle} /></div>
                    <div style={{ flex: 1 }}><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>Phân loại</label><select value={newProduct.type} onChange={(e) => setNewProduct({...newProduct, type: e.target.value})} style={inputStyle}><option>Dịch vụ</option><option>Linh kiện</option><option>Phụ kiện</option></select></div>
                    <div style={{ flex: 1 }}><label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>Giá tiền</label><input type="text" placeholder="VD: 500.000đ" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} style={inputStyle} /></div>
                  </div>
                  
                  {/* PHẦN CHỌN ẢNH ĐƯỢC NÂNG CẤP */}
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>Link hoặc File ảnh minh họa (Tùy chọn)</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input type="text" placeholder="Dán link ảnh vào đây..." value={newProduct.image} onChange={(e) => setNewProduct({...newProduct, image: e.target.value})} style={{...inputStyle, flex: 1}} />
                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: "120px", fontSize: "13px", padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", backgroundColor: "#f8fafc", color: "#475569" }} title="Hoặc tải ảnh từ máy tính" />
                      </div>
                    </div>
                    <button type="submit" style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "12px 32px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", height: "42px" }}>Lưu lại</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ backgroundColor: "white", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead><tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}><th style={{ padding: "16px", color: "#475569", width: "80px" }}>Hình ảnh</th><th style={{ padding: "16px", color: "#475569" }}>Tên dịch vụ / Sản phẩm</th><th style={{ padding: "16px", color: "#475569" }}>Phân loại</th><th style={{ padding: "16px", color: "#475569" }}>Giá</th><th style={{ padding: "16px", textAlign: "center", color: "#475569" }}>Xóa</th></tr></thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "16px" }}><img src={item.image || "https://placehold.co/100x100?text=No+Image"} alt={item.name} style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0" }} /></td>
                      <td style={{ padding: "16px", fontWeight: "600", color: "#0f172a" }}>{item.name}</td>
                      <td style={{ padding: "16px" }}><span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", backgroundColor: item.type === "Dịch vụ" ? "#dbeafe" : "#fef3c7", color: item.type === "Dịch vụ" ? "#2563eb" : "#d97706" }}>{item.type}</span></td>
                      <td style={{ padding: "16px", fontWeight: "bold", color: "#0f172a" }}>{item.price}</td>
                      <td style={{ padding: "16px", textAlign: "center" }}><button onClick={() => handleDeleteProduct(item.id)} style={{ backgroundColor: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "18px" }}>🗑️</button></td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Chưa có sản phẩm nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* POPUP (MODAL) CHI TIẾT YÊU CẦU SỬA CHỮA    */}
      {/* ========================================== */}
      {selectedRequest && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", width: "100%", maxWidth: "600px", padding: "32px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: "20px", fontWeight: "bold" }}>Chi tiết yêu cầu sửa chữa</h2>
              <button onClick={() => setSelectedRequest(null)} style={{ background: "transparent", border: "none", fontSize: "24px", color: "#64748b", cursor: "pointer", padding: "0 8px" }}>&times;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Loại thiết bị</label><select disabled style={{...detailInputStyle, backgroundColor: "#f8fafc", color: "#64748b", cursor: "not-allowed"}}><option>{selectedRequest.detail.deviceType}</option></select></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>Thương hiệu</label><select disabled style={{...detailInputStyle, backgroundColor: "#f8fafc", color: "#64748b", cursor: "not-allowed"}}><option>{selectedRequest.detail.brand}</option></select></div>
              </div>
              <div><label style={labelStyle}>Model / dòng máy</label><input type="text" readOnly value={selectedRequest.detail.model} style={{...detailInputStyle, backgroundColor: "#f8fafc"}} /></div>
              <div><label style={labelStyle}>Tiêu đề vấn đề</label><input type="text" readOnly value={selectedRequest.detail.title} style={{...detailInputStyle, backgroundColor: "#f8fafc"}} /></div>
              <div>
                <label style={{...labelStyle, marginBottom: "8px"}}>Nhóm lỗi liên quan</label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {["Màn hình", "Cảm ứng", "Pin", "Camera", "Nguồn", "Tản nhiệt"].map((tag) => {
                    const isActive = selectedRequest.detail.categories.includes(tag);
                    return (<span key={tag} style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600", backgroundColor: isActive ? "#3b82f6" : "white", color: isActive ? "white" : "#475569", border: isActive ? "1px solid #3b82f6" : "1px solid #cbd5e1" }}>{tag}</span>);
                  })}
                </div>
              </div>
              <div><label style={labelStyle}>Mô tả chi tiết</label><textarea readOnly value={selectedRequest.detail.description} rows="3" style={{...detailInputStyle, backgroundColor: "#f8fafc", resize: "none"}} /></div>
              <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "4px 0" }}></div>
              <div>
                <label style={{...labelStyle, marginBottom: "12px"}}>Hình thức tiếp nhận</label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {["Mang đến cửa hàng", "Nhận tận nơi", "Kiểm tra tại chỗ"].map((method) => {
                    const isActive = selectedRequest.detail.receiveMethod === method;
                    return (<span key={method} style={{ padding: "10px 18px", borderRadius: "25px", fontSize: "14px", fontWeight: "600", backgroundColor: isActive ? "#2563eb" : "white", color: isActive ? "white" : "#475569", border: isActive ? "none" : "1px solid #cbd5e1", boxShadow: isActive ? "0 4px 10px rgba(37, 99, 235, 0.3)" : "none" }}>{method}</span>);
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Ngân sách dự kiến</label><input type="text" readOnly value={selectedRequest.detail.budget} style={{...detailInputStyle, backgroundColor: "#f8fafc"}} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>Ngày mong muốn</label><input type="text" readOnly value={selectedRequest.detail.desiredDate} style={{...detailInputStyle, backgroundColor: "#f8fafc"}} /></div>
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Số điện thoại liên hệ</label><input type="text" readOnly value={selectedRequest.detail.phone} style={{...detailInputStyle, backgroundColor: "#f8fafc"}} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>Địa chỉ nhận máy</label><input type="text" readOnly value={selectedRequest.detail.address} style={{...detailInputStyle, backgroundColor: "#f8fafc"}} /></div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
              <button onClick={() => setSelectedRequest(null)} style={{ padding: "10px 20px", backgroundColor: "white", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Đóng</button>
              <button onClick={() => handleReject(selectedRequest.id)} style={{ padding: "10px 20px", backgroundColor: "white", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Từ chối đơn</button>
              <button onClick={() => handleAccept(selectedRequest.id)} style={{ padding: "10px 24px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(59, 130, 246, 0.3)" }}>Chấp nhận sửa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}