import { API_BASE } from '../utils/constants';

// ── Diagnose API — Decision Tree ──
export async function fetchAnimals() {
    const res = await fetch(`${API_BASE}/animals`);
    return res.json();
}

export async function fetchSymptoms(animalId) {
    const res = await fetch(`${API_BASE}/animal/${animalId}/symptoms`);
    return res.json();
}

export async function fetchActionable(actionId) {
    const res = await fetch(`${API_BASE}/action/${actionId}`);
    return res.json();
}

// ── Feedback API ──
export async function submitFeedback(diagnoseId, content) {
    const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnose_id: diagnoseId, content }),
    });
    return res.json();
}

// ── Affiliate API ──
export async function fetchAffiliateProducts(diseaseId, petType) {
    const url = new URL(`${API_BASE}/affiliate/${diseaseId}`);
    if (petType) url.searchParams.set('pet_type', petType);
    const res = await fetch(url);
    return res.json();
}
