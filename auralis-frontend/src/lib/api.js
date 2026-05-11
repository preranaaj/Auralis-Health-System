const BASE_URL = '/api';

export const fetchPatients = async () => {
    const response = await fetch(`${BASE_URL}/patients`);
    if (!response.ok) throw new Error('Failed to fetch patients');
    return response.json();
};

export const fetchPatientById = async (id) => {
    const response = await fetch(`${BASE_URL}/patients/${id}`);
    if (!response.ok) throw new Error('Failed to fetch patient details');
    return response.json();
};

export const fetchPatientVitals = async (id) => {
    const response = await fetch(`${BASE_URL}/patients/${id}/vitals`);
    if (!response.ok) throw new Error('Failed to fetch vitals');
    return response.json();
};

export const fetchPatientTimeline = async (id) => {
    const response = await fetch(`${BASE_URL}/patients/${id}/timeline`);
    if (!response.ok) throw new Error('Failed to fetch timeline');
    return response.json();
};

export const addPatient = async (patientData) => {
    const response = await fetch(`${BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
    });
    if (!response.ok) throw new Error('Failed to admit patient');
    return response.json();
};

export const updatePatient = async (id, patientData) => {
    const response = await fetch(`${BASE_URL}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
    });
    if (!response.ok) throw new Error('Failed to update patient');
    return response.json();
};

export const deletePatient = async (id) => {
    const response = await fetch(`${BASE_URL}/patients/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete patient');
    return response.json();
};

export const fetchDoctors = async () => {
    const response = await fetch(`${BASE_URL}/doctors`);
    if (!response.ok) throw new Error('Failed to fetch clinical staff');
    return response.json();
};

export const fetchDoctorById = async (id) => {
    const response = await fetch(`${BASE_URL}/doctors/${id}`);
    if (!response.ok) throw new Error('Failed to fetch doctor details');
    return response.json();
};

export const updateDoctor = async (id, data) => {
    const response = await fetch(`${BASE_URL}/doctors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update doctor profile');
    return response.json();
};

export const deleteDoctor = async (id) => {
    const response = await fetch(`${BASE_URL}/doctors/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete doctor');
    return response.json();
};

export const addVitals = async (patientId, vitals) => {
    const response = await fetch(`${BASE_URL}/patients/${patientId}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitals)
    });
    if (!response.ok) throw new Error('Failed to record vitals');
    return response.json();
};

export const bookAppointment = async (data) => {
    const response = await fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
};

export const fetchAppointments = async (userId, role) => {
    const response = await fetch(`${BASE_URL}/appointments?user_id=${userId}&role=${role}`);
    return response.json();
};

export const updateAppointment = async (id, data) => {
    const response = await fetch(`${BASE_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
};

export const fetchAllUsers = async () => {
    const response = await fetch(`${BASE_URL}/admin/users`);
    return response.json();
};

export const deleteUser = async (id) => {
    const response = await fetch(`${BASE_URL}/admin/users/${id}`, {
        method: 'DELETE'
    });
    return response.json();
};

export const fetchAdminStats = async () => {
    const response = await fetch(`${BASE_URL}/admin/stats`);
    return response.json();
};

export const submitReview = async (doctorId, reviewData) => {
    const response = await fetch(`${BASE_URL}/doctors/${doctorId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
    });
    if (!response.ok) throw new Error('Failed to submit review');
    return response.json();
};

export const fetchReviews = async (doctorId) => {
    const response = await fetch(`${BASE_URL}/doctors/${doctorId}/reviews`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
};

export const fetchDiagnosis = async (patientId) => {
    const response = await fetch(`${BASE_URL}/patients/${patientId}/diagnosis`);
    if (!response.ok) throw new Error('Failed to fetch diagnosis');
    return response.json();
};

export const submitDiagnosis = async (patientId, data) => {
    const response = await fetch(`${BASE_URL}/patients/${patientId}/diagnosis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to submit diagnosis');
    return response.json();
};

export const fetchBills = async (patientId) => {
    const response = await fetch(`${BASE_URL}/patients/${patientId}/bills`);
    if (!response.ok) throw new Error('Failed to fetch bills');
    return response.json();
};

export const submitBill = async (patientId, data) => {
    const response = await fetch(`${BASE_URL}/patients/${patientId}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to generate bill');
    return response.json();
};
export const fetchAuditLogs = async () => {
    const response = await fetch(`${BASE_URL}/admin/audit-logs`);
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
};

export const fetchPatientMLTrends = async (id, timeScale = 'all') => {
    const response = await fetch(`${BASE_URL}/patients/${id}/ml-trends?time_scale=${timeScale}`);
    if (!response.ok) throw new Error('Failed to fetch ML trends');
    return response.json();
};

export const fetchPatientRiskAssessment = async (id) => {
    const response = await fetch(`${BASE_URL}/patients/${id}/risk-assessment`);
    if (!response.ok) throw new Error('Failed to fetch risk assessment');
    return response.json();
};

export const fetchPatientRiskHistory = async (id) => {
    const response = await fetch(`${BASE_URL}/patients/${id}/risk-history`);
    if (!response.ok) throw new Error('Failed to fetch risk history');
    return response.json();
};
