import React, { useState } from 'react';
import { X, Home, Send, CheckCircle2 } from 'lucide-react';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnquiryModal: React.FC<EnquiryModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    corridor: 'Central Bengaluru',
    capacity: '2,000 - 10,000 sq ft',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2400);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="modal-header">
          <div className="modal-icon">
            <Home size={15} />
          </div>
          <div>
            <div className="modal-title">Storage &amp; Hub Booking Enquiry</div>
            <div className="modal-sub">Namma Warehouse Bengaluru Logistics Operations</div>
          </div>
        </div>

        {submitted ? (
          <div className="success-box">
            <div className="success-icon">
              <CheckCircle2 size={24} color="#059669" />
            </div>
            <div className="success-title">Enquiry Submitted!</div>
            <div className="success-msg">
              Our Bengaluru fulfillment coordinator will reach out within 30 minutes with slot availability and pricing.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label">Your Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Arjun Swaminathan"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Company / Brand</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. RapidMart Express"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Preferred Hub Corridor</label>
                <select
                  className="form-input"
                  value={formData.corridor}
                  onChange={(e) => setFormData({ ...formData, corridor: e.target.value })}
                >
                  <option>Central Bengaluru</option>
                  <option>Whitefield / East</option>
                  <option>Peenya / North</option>
                  <option>Electronic City / South</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Capacity Needed</label>
                <select
                  className="form-input"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                >
                  <option>500 - 2,000 sq ft</option>
                  <option>2,000 - 10,000 sq ft</option>
                  <option>10,000+ sq ft (Bulk)</option>
                  <option>Pallet Storage (10-100)</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                <Send size={13} />
                Submit Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
