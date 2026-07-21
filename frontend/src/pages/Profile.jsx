import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import StatCard from '../components/ui/StatCard'
import { profileAPI } from '../services/api'
import { 
  User, Mail, Shield, Calendar, MapPin, 
  Phone, Edit3, Camera, Lock, CheckCircle, 
  XCircle, Loader2, Save, X, Truck, FileCheck, DollarSign
} from 'lucide-react'

// Simple inline toast component
const Toast = ({ msg, type, onClose }) => {
  if (!msg) return null;
  const isError = type === 'error';
  return (
    <div style={{
      position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
      background: isError ? '#ef4444' : '#10b981', color: '#fff',
      padding: '0.75rem 1.25rem', borderRadius: 8, display: 'flex', 
      alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      animation: 'staggerUp 0.3s ease both'
    }}>
      {isError ? <XCircle size={18} /> : <CheckCircle size={18} />}
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', marginLeft: '0.5rem' }}>
        <X size={16} />
      </button>
    </div>
  )
}

export default function Profile() {
  const { user, token } = useAuth()
  
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  const [toast, setToast] = useState({ msg: '', type: '' })

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdSaving, setPwdSaving] = useState(false)

  // Bank Details State
  const [bankDetails, setBankDetails] = useState(null)
  const [isBankEditing, setIsBankEditing] = useState(false)
  const [bankFormData, setBankFormData] = useState({})
  const [bankSaving, setBankSaving] = useState(false)
  const [bankPwdPrompt, setBankPwdPrompt] = useState(false)
  const [bankCurrentPwd, setBankCurrentPwd] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profRes, statsRes] = await Promise.all([
          profileAPI.getProfile(token),
          profileAPI.getStats(token)
        ]);
        setProfile(profRes.data);
        setFormData(profRes.data);
        setStats(statsRes.data);

        if (profRes.data.role === 'agent') {
          profileAPI.getBankDetails(token).then(res => {
            setBankDetails(res.data);
            setBankFormData(res.data || {});
          }).catch(console.error);
        }
      } catch (err) {
        showToast(err.message || 'Failed to load profile', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const res = await profileAPI.updateProfile(formData, token);
      setProfile(res.data);
      setFormData(res.data);
      setIsEditing(false);
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be less than 2MB', 'error');
      return;
    }

    // Immediate preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setUploadingAvatar(true);

    try {
      const data = new FormData();
      data.append('avatar', file);
      const res = await profileAPI.uploadAvatar(data, token);
      
      setProfile(prev => ({ ...prev, avatarUrl: res.data.avatarUrl }));
      showToast('Avatar updated');
    } catch (err) {
      showToast(err.message || 'Failed to upload avatar', 'error');
      setAvatarPreview(null); // revert
    } finally {
      setUploadingAvatar(false);
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      return showToast('Passwords do not match', 'error');
    }
    if (pwdData.newPassword.length < 6) {
      return showToast('New password must be at least 6 characters', 'error');
    }

    try {
      setPwdSaving(true);
      await profileAPI.updatePassword({
        currentPassword: pwdData.currentPassword,
        newPassword: pwdData.newPassword
      }, token);
      showToast('Password changed successfully');
      setIsPasswordModalOpen(false);
      setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setPwdSaving(false)
    }
  }

  const handleBankInputChange = (e) => {
    const { name, value } = e.target;
    setBankFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (bankFormData.accountNumber && bankFormData.accountNumber !== bankFormData.confirmAccountNumber) {
      return showToast('Account numbers do not match', 'error');
    }
    setBankPwdPrompt(true); // Prompt for password before saving
  }

  const handleConfirmBankSave = async (e) => {
    e.preventDefault();
    if (!bankCurrentPwd) return showToast('Password is required', 'error');
    try {
      setBankSaving(true);
      const res = await profileAPI.updateBankDetails({ ...bankFormData, currentPassword: bankCurrentPwd }, token);
      setBankDetails(res.data);
      setBankFormData(res.data);
      setIsBankEditing(false);
      setBankPwdPrompt(false);
      setBankCurrentPwd('');
      showToast('Payout details updated safely');
    } catch (err) {
      showToast(err.message || 'Failed to update payout details', 'error');
    } finally {
      setBankSaving(false);
    }
  }

  const isAgent = user?.role === 'agent'

  if (loading) {
    return (
      <DashboardLayout title="My Profile" role={user?.role}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={32} className="spin" color="var(--accent-indigo)" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Profile" role={user?.role}>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: '' })} />

      <div className="dash-container" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: '3rem' }}>
        
        {/* TOP SUMMARY CARD (HERO) */}
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'staggerUp 0.4s ease both', marginBottom: '1.5rem', position: 'relative' }}>
          
          {/* Avatar Area */}
          <div 
            style={{ 
              position: 'relative', 
              width: 100, height: 100, borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--accent-indigo), #4f46e5)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '2.5rem', fontWeight: 800, color: '#fff', 
              marginBottom: '1.5rem', 
              boxShadow: '0 8px 24px rgba(99,102,241,0.2)',
              border: '2px solid rgba(99,102,241,0.5)',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            onClick={() => fileInputRef.current?.click()}
            title="Click to change avatar"
          >
            {(avatarPreview || profile?.avatarUrl) ? (
              <img 
                src={avatarPreview || profile.avatarUrl} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              profile?.name?.[0]?.toUpperCase() || 'U'
            )}
            
            {/* Hover overlay for upload */}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s', ':hover': { opacity: 1 }
            }} className="avatar-hover-overlay">
              {uploadingAvatar ? <Loader2 className="spin" size={24} color="#fff" /> : <Camera size={24} color="#fff" />}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/jpeg, image/png, image/webp" 
              onChange={handleAvatarChange}
            />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {profile?.name}
          </h1>
          <div style={{ fontSize: '0.9rem', color: 'rgba(240,240,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
            <Mail size={14} /> {profile?.email}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ padding: '0.2rem 0.8rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
              {profile?.role}
            </span>
            <span style={{ padding: '0.2rem 0.8rem', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 500 }}>
              Member since {new Date(profile?.createdAt).getFullYear()}
            </span>
          </div>
        </div>

        {/* STATS SECTION */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', animation: 'staggerUp 0.5s ease both' }}>
            {profile.role === 'customer' && (
              <>
                <StatCard label="Total Orders" value={stats.totalOrders} icon={Calendar} />
                <StatCard label="Total Spent" value={stats.totalSpent || 0} prefix="₹" icon={Edit3} />
              </>
            )}
            {profile.role === 'agent' && (
              <>
                <StatCard label="Total Deliveries" value={stats.totalDeliveries} icon={Truck} color="var(--accent-indigo)" />
                <StatCard label="Rating" value={stats.rating ? stats.rating.toFixed(1) : 'N/A'} icon={CheckCircle} color="#10b981" />
                <StatCard label="Documents" value={stats.documentsVerified ? 'Verified' : 'Pending'} icon={FileCheck} color={stats.documentsVerified ? '#10b981' : '#f59e0b'} />
              </>
            )}
          </div>
        )}

        {/* DETAILS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', animation: 'staggerUp 0.6s ease both' }}>
          
          {/* Main Info Form */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <User size={18} color="var(--accent-indigo)" /> Personal Information
              </h2>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <Edit3 size={14} /> Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setIsEditing(false); setFormData(profile); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving} style={{ background: 'var(--accent-indigo)', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Full Name</label>
                {isEditing ? (
                  <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                ) : (
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profile?.name}</div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Phone Number</label>
                {isEditing ? (
                  <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                ) : (
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profile?.phone || 'Not set'}</div>
                )}
              </div>

              {/* Alternate Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Alternate Phone</label>
                {isEditing ? (
                  <input type="tel" name="alternatePhone" value={formData.alternatePhone || ''} onChange={handleInputChange} placeholder="Optional" style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                ) : (
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profile?.alternatePhone || 'Not set'}</div>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Date of Birth</label>
                {isEditing ? (
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                ) : (
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not set'}</div>
                )}
              </div>

              {/* Bio */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Bio</label>
                {isEditing ? (
                  <textarea name="bio" value={formData.bio || ''} onChange={handleInputChange} rows={3} placeholder="A short description about yourself" style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', resize: 'none' }} />
                ) : (
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>{profile?.bio || 'No bio provided'}</div>
                )}
              </div>

              {/* Address (Customer Only) */}
              {profile?.role === 'customer' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Default Delivery Address</label>
                  {isEditing ? (
                    <textarea name="address" value={formData.address || ''} onChange={handleInputChange} rows={3} placeholder="Full address" style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', resize: 'none' }} />
                  ) : (
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>{profile?.address || 'No address set'}</div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Agent Specific Info */}
          {isAgent && (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: 20 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Truck size={18} color="var(--accent-indigo)" /> Vehicle Information
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Vehicle Type</label>
                  {isEditing ? (
                    <select name="vehicleType" value={formData.vehicleType || 'BIKE'} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}>
                      <option value="BIKE">Bike</option>
                      <option value="SCOOTY">Scooty</option>
                      <option value="VAN">Van</option>
                      <option value="TRUCK">Truck</option>
                    </select>
                  ) : (
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{profile?.vehicleType || 'Not set'}</div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Vehicle Number</label>
                  {isEditing ? (
                    <input type="text" name="vehicleNumber" value={formData.vehicleNumber || ''} onChange={handleInputChange} placeholder="e.g. MH01AB1234" style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  ) : (
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profile?.vehicleNumber || 'Not set'}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security / Password */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Lock size={18} color="var(--accent-indigo)" /> Security
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.2rem' }}>Password</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Secure your account with a strong password</div>
              </div>
              <button onClick={() => setIsPasswordModalOpen(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                Change Password
              </button>
            </div>
          </div>

          {/* PAYOUT DETAILS (Agent Only) */}
          {isAgent && (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: 20, marginTop: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <DollarSign size={18} color="#10b981" /> Payout Details
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Lock size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                    Your bank details are encrypted and only used for processing delivery earnings.
                  </p>
                </div>
                {!isBankEditing && (
                  <button onClick={() => { setIsBankEditing(true); setBankFormData(bankDetails || {}); }} className="btn-ghost" style={{ padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.85rem' }}>
                    {bankDetails ? 'Edit' : 'Add Details'}
                  </button>
                )}
              </div>

              {!bankDetails && !isBankEditing ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#10b981' }}>
                    <DollarSign size={24} />
                  </div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Payout Details</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Add your bank details to receive delivery earnings.</p>
                  <button onClick={() => setIsBankEditing(true)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Add Bank Details
                  </button>
                </div>
              ) : isBankEditing ? (
                <form onSubmit={handleBankSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Account Holder Name</label>
                      <input type="text" name="accountHolderName" required value={bankFormData.accountHolderName || ''} onChange={handleBankInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>IFSC Code</label>
                      <input type="text" name="ifscCode" required placeholder="HDFC0001234" value={bankFormData.ifscCode || ''} onChange={handleBankInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', textTransform: 'uppercase' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Account Number</label>
                      <input type="password" name="accountNumber" required={!bankDetails} placeholder={bankDetails ? bankDetails.accountNumberLast4 : ''} value={bankFormData.accountNumber || ''} onChange={handleBankInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', letterSpacing: '2px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Confirm Account Number</label>
                      <input type="password" name="confirmAccountNumber" required={!!bankFormData.accountNumber} value={bankFormData.confirmAccountNumber || ''} onChange={handleBankInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', letterSpacing: '2px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Bank Name (Optional)</label>
                      <input type="text" name="bankName" value={bankFormData.bankName || ''} onChange={handleBankInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>UPI ID (Optional)</label>
                      <input type="text" name="upiId" value={bankFormData.upiId || ''} onChange={handleBankInputChange} style={{ width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setIsBankEditing(false)} className="btn-ghost" style={{ padding: '0.6rem 1.25rem', borderRadius: 8 }}>Cancel</button>
                    <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Proceed to Save</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Account Holder</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{bankDetails.accountHolderName}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Account Number</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '2px' }}>{bankDetails.accountNumberLast4}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Bank & IFSC</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{bankDetails.bankName} ({bankDetails.ifscCode})</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Verification Status</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 999, background: bankDetails.isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)', color: bankDetails.isVerified ? '#10b981' : '#fbbf24' }}>
                      {bankDetails.isVerified ? <><CheckCircle size={14}/> Verified ✓</> : 'Pending Verification'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 400, padding: '2rem', borderRadius: 20, position: 'relative' }}>
            <button onClick={() => setIsPasswordModalOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '1.5rem' }}>Change Password</h2>
            
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Current Password</label>
                <input 
                  type="password" required
                  value={pwdData.currentPassword} 
                  onChange={e => setPwdData({...pwdData, currentPassword: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>New Password</label>
                <input 
                  type="password" required minLength={6}
                  value={pwdData.newPassword} 
                  onChange={e => setPwdData({...pwdData, newPassword: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Confirm New Password</label>
                <input 
                  type="password" required minLength={6}
                  value={pwdData.confirmPassword} 
                  onChange={e => setPwdData({...pwdData, confirmPassword: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff' }}
                />
              </div>
              
              <button 
                type="submit" disabled={pwdSaving}
                style={{ background: 'var(--accent-indigo)', color: '#fff', border: 'none', padding: '0.875rem', borderRadius: 10, fontSize: '0.95rem', fontWeight: 600, marginTop: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                {pwdSaving ? <Loader2 size={18} className="spin" /> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bank Password Confirmation Modal */}
      {bankPwdPrompt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 400, padding: '2rem', borderRadius: 20, position: 'relative' }}>
            <button onClick={() => setBankPwdPrompt(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Security Check</h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>Please enter your current account password to save payout details.</p>
            
            <form onSubmit={handleConfirmBankSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Current Password</label>
                <input 
                  type="password" required
                  value={bankCurrentPwd} 
                  onChange={e => setBankCurrentPwd(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff' }}
                />
              </div>
              
              <button 
                type="submit" disabled={bankSaving}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.875rem', borderRadius: 10, fontSize: '0.95rem', fontWeight: 600, marginTop: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                {bankSaving ? <Loader2 size={18} className="spin" /> : 'Confirm & Save'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Style for Avatar Hover - since it uses CSS pseudo classes which can't be inline easily */}
      <style>{`
        .avatar-hover-overlay { opacity: 0; }
        .avatar-hover-overlay:hover { opacity: 1 !important; }
      `}</style>
    </DashboardLayout>
  )
}
