/**
 * Artiva Real API Engine
 * Integrates with the Verifix Firebase Backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/verifix-backend/us-central1/api';

const STORAGE_KEYS = {
  CURRENT_USER: 'artiva_current_user',
};

export const TradeServicesMap = {
  'Plumbing': ['Leak Repair', 'Pipe Installation', 'Water Heater Fix', 'Drain Unclogging', 'Bathroom Fitting'],
  'Electrical': ['Inverter & Solar Setup', 'Meter Installation', 'Generator Changeover Switch', 'Circuit Repair', 'Conduit Wiring'],
  'Carpentry': ['Cabinet Repair', 'Door Lock Fitting', 'Wardrobe Design', 'Furniture Assembly', 'Roof Truss Work'],
  'AC Repair': ['Gas Refilling', 'AC Cleaning & Servicing', 'Compressor Repair', 'Split Unit Installation'],
  'Painting': ['Wall Screeding', 'Interior Painting', 'Exterior Weatherproof Coating', 'POP Finishing'],
  'Generators': ['Engine Servicing', 'Carburetor Cleaning', 'AVR Replacement', 'Oil Change & Tuning']
};

export const LifeCampLocations = [
  'Brains & Hammers Estate, Life Camp',
  'Minister\'s Hill, Life Camp',
  '1st Avenue, Life Camp Junction',
  'Dape District, Life Camp',
  'Gwarinpa Expressway Axis, Life Camp',
  'Godab Estate, Life Camp',
  'Kado Estate Boundary, Life Camp'
];

// Helper to get auth token
function getAuthHeaders() {
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    return user && user.token ? { 'Authorization': `Bearer ${user.token}` } : {};
  } catch (e) {
    return {};
  }
}

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || errorData.message || 'API request failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const ApiService = {
  init() {
    // No-op for real backend
  },

  // 1. Auth - Send OTP
  async sendOtp(phone) {
    if (!phone || phone.length < 10) {
      throw new Error('Please enter a valid phone number (+234...)');
    }
    const data = await fetchWithAuth('/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
    return data;
  },

  // 2. Auth - Verify OTP
  async verifyOtp(phone, otp, role = 'client') {
    // Temporary bypass for local development without Firebase config
    const idToken = `TEST_TOKEN_${Date.now()}`;
    
    const data = await fetchWithAuth('/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ 
        idToken,
        first_name: role === 'client' ? 'Chinedu' : 'Artisan User',
        last_name: role === 'client' ? 'Eze' : 'Demo',
        role
      })
    });

    const user = {
      uid: data.data.uid,
      phone: data.data.phone,
      first_name: data.data.first_name,
      last_name: data.data.last_name,
      role: data.data.role,
      token: idToken,
    };

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { token: user.token, user };
  },

  // 3. Artisan Signup
  async signupArtisan(data) {
    const { first_name, last_name, trade, location, services, nin, phone } = data;
    
    if (!first_name || !last_name || !trade || !nin || services.length === 0) {
      throw new Error('Please fill in all required fields including NIN and at least 1 service.');
    }

    const res = await fetchWithAuth('/artisans', {
      method: 'POST',
      body: JSON.stringify({
        trade,
        category: 'Home Maintenance & Repair',
        location: { city: location || 'Life Camp', state: 'FCT', lga: 'AMAC' },
        skills: services,
        tagline: `${trade} specialist`,
        work_photos: data.work_photos || []
      })
    });
    return { artisanId: res.data.uid, artisan: res.data };
  },

  // 4. Update Artisan Availability
  async updateAvailability(uid, available) {
    const res = await fetchWithAuth(`/artisans/profile/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_available: available })
    });
    return res;
  },

  // 5. Get Artisans List
  async getArtisans(filter = {}) {
    const query = new URLSearchParams();
    if (filter.trade) query.append('trade', filter.trade);
    
    const res = await fetchWithAuth(`/artisans?${query.toString()}`);
    let artisans = res.data || [];
    
    if (filter.available !== undefined) {
      artisans = artisans.filter(a => a.is_available === filter.available);
    }
    if (filter.verifiedOnly !== false) {
      artisans = artisans.filter(a => a.is_verified);
    }
    return artisans;
  },

  // 6. Get Single Artisan
  async getArtisanById(id) {
    const res = await fetchWithAuth(`/artisans/${id}`);
    return res.data;
  },

  // 7. Get Artisan Dashboard Stats
  async getArtisanDashboard(uid) {
    const res = await fetchWithAuth(`/artisans/${uid}`);
    const artisan = res.data;
    
    return {
      held_total: 0,
      released_total: 0,
      completed_jobs: artisan?.completed_jobs || 0,
      reputation_score: artisan?.reputation_score || 0,
      verified: artisan?.is_verified || false
    };
  },

  // 8. Post a Job 
  async postJob(jobData) {
    const { trade, location, urgency, description, budget, photos } = jobData;
    const res = await fetchWithAuth('/jobs', {
      method: 'POST',
      body: JSON.stringify({
        trade,
        location: { city: location, state: 'FCT', lga: 'AMAC' },
        urgency: urgency || 'low',
        description,
        title: `${trade} needed`,
        budget: budget ? Number(budget) : undefined
      })
    });
    return { jobId: res.data.id, job: res.data };
  },

  // 9. Get Job Details
  async getJobById(id) {
    const res = await fetchWithAuth(`/jobs/${id}`);
    return res.data;
  },

  // 10. Get Job Matches
  async getJobMatches(jobId) {
    const res = await fetchWithAuth(`/jobs/${jobId}/matches`);
    return res.data || [];
  },

  // 11. Initialize Payment
  async initializePayment(jobId, artisanId) {
    const res = await fetchWithAuth(`/payments/initialize`, {
      method: 'POST',
      body: JSON.stringify({
        job_id: jobId,
        artisan_id: artisanId,
        amount: 5000 
      })
    });
    return {
      authorizationUrl: res.data.authorization_url,
      reference: res.data.reference,
      success: true
    };
  },

  // 12. Unlock Chat
  async unlockChat(jobId) {
    // Currently backend doesn't have a chat endpoint, simulating success
    return { success: true, matchId: `match_${jobId}` };
  },

  // 13. Send In-App Chat Message
  async sendMessage(matchId, senderUid, text, photoUrl = null) {
    // Mocking chat as it's not implemented on the backend yet
    return {
      message_id: 'msg_' + Date.now(),
      match_id: matchId,
      sender_uid: senderUid,
      text,
      photo_url: photoUrl,
      created_at: new Date().toISOString(),
      read_at: null
    };
  },

  // 14. Get Messages for Match
  async getMessages(matchId) {
    return [];
  },

  // 15. Complete Job
  async completeJob(jobId, matchId) {
    const res = await fetchWithAuth(`/jobs/${jobId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ match_id: matchId })
    });
    return res;
  },

  // 16. Rate Job
  async rateJob(jobId, rating, review = '') {
    const res = await fetchWithAuth(`/jobs/${jobId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ score: rating, review })
    });
    return res;
  },

  // 17. Admin Verification Queue
  async getAdminQueue() {
    return [];
  },

  // 18. Admin Approve Artisan
  async verifyArtisan(uid) {
    const res = await fetchWithAuth(`/admin/artisans/${uid}/verify`, {
      method: 'POST'
    });
    return res;
  }
};
