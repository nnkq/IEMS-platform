import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TechnicianLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('abc123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/technician/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('techUser', JSON.stringify(data.tech));
        alert(`👋 Đăng nhập thành công! Xin chào Kỹ thuật viên: ${data.tech.name}`);
        navigate('/technician');
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối đến máy chủ Backend!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#3b82f6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 16px auto', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)' }}>
            👨‍🔧
          </div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px' }}>Staff Portal</h2>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>Đăng nhập dành cho Kỹ thuật viên</p>
        </div>

        {error && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #fca5a5', fontSize: '14px', textAlign: 'center', fontWeight: '500' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155', fontSize: '14px' }}>Số điện thoại đăng nhập</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập SĐT chủ cửa hàng đã cấp..."
              required
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155', fontSize: '14px' }}>Mật khẩu</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              required
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ marginTop: '10px', padding: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}
          </button>
        </form>
        
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', fontSize: '13px', color: '#64748b' }}>
          <strong>Lưu ý:</strong> Tài khoản là Số điện thoại của bạn. Mật khẩu mặc định là <strong>abc123</strong> trừ khi bạn đã đổi.
        </div>
      </div>
    </div>
  );
}