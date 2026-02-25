import { useState, useMemo } from 'react';
import diseasesData from '../data/diseases.json';
import AffiliateCompare from '../components/AffiliateCompare';

const PET_TYPES = [
    { id: 'dog', name: 'Chó', emoji: '🐕', species: 'Dog' },
    { id: 'cat', name: 'Mèo', emoji: '🐈', species: 'Cat' },
];

const STEPS = {
    PET: 'pet',
    SYMPTOMS: 'symptoms',
    NARROWING: 'narrowing',
    QUESTIONS: 'questions',
    IMAGE_CONFIRM: 'image_confirm',
    RESULT: 'result',
};

function getSeverityInfo(score) {
    if (score >= 8) return { label: 'Nghiêm trọng', color: '#ef4444', icon: '🔴' };
    if (score >= 5) return { label: 'Trung bình', color: '#f59e0b', icon: '🟡' };
    return { label: 'Nhẹ', color: '#22c55e', icon: '🟢' };
}

// Normalize Vietnamese text for matching
function normalize(text) {
    return text.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .trim();
}

// Match user symptoms against disease keywords
function matchDiseases(species, userSymptoms, diseases) {
    const normalizedInputs = userSymptoms.map(s => normalize(s));

    return diseases
        .filter(d => {
            const dSpecies = (d.species || '').toLowerCase();
            return dSpecies === species.toLowerCase() || dSpecies === 'both' || dSpecies === '';
        })
        .map(d => {
            const keywords = (d.symptom_keywords || []).map(k => k.toLowerCase());
            let score = 0;
            const matched = [];
            const unmatched = [];

            for (const kw of keywords) {
                const kwNorm = normalize(kw);
                const isMatch = normalizedInputs.some(input =>
                    kwNorm.includes(input) || input.includes(kwNorm)
                );
                if (isMatch) {
                    score++;
                    matched.push(kw);
                } else {
                    unmatched.push(kw);
                }
            }

            return { ...d, score, matched, unmatched };
        })
        .filter(d => d.score > 0)
        .sort((a, b) => b.score - a.score);
}

// Generate follow-up questions from unmatched symptoms of top diseases
function generateQuestions(topDiseases) {
    const questionMap = {};
    for (const d of topDiseases.slice(0, 5)) {
        for (const symptom of d.unmatched.slice(0, 3)) {
            if (!questionMap[symptom]) {
                questionMap[symptom] = {
                    symptom,
                    relatedDiseases: [],
                };
            }
            questionMap[symptom].relatedDiseases.push(d.disease_name);
        }
    }

    return Object.values(questionMap)
        .sort((a, b) => b.relatedDiseases.length - a.relatedDiseases.length)
        .slice(0, 5);
}

export default function Diagnose() {
    const [step, setStep] = useState(STEPS.PET);
    const [selectedPet, setSelectedPet] = useState(null);
    const [symptomInput, setSymptomInput] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [questionAnswers, setQuestionAnswers] = useState({});
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [selectedDisease, setSelectedDisease] = useState(null);

    // Step 1: Select pet type
    const handleSelectPet = (petType) => {
        setSelectedPet(petType);
        setStep(STEPS.SYMPTOMS);
    };

    // Step 2: Submit symptoms
    const handleSubmitSymptoms = () => {
        if (!symptomInput.trim()) return;
        const symptoms = symptomInput.split(',').map(s => s.trim()).filter(Boolean);
        if (symptoms.length === 0) return;

        const species = PET_TYPES.find(p => p.id === selectedPet)?.species || 'Dog';
        const results = matchDiseases(species, symptoms, diseasesData);
        setCandidates(results);

        if (results.length === 0) {
            setStep(STEPS.RESULT);
            return;
        }

        // Separate diseases needing image vs not
        const needsImageDiseases = results.filter(d => d.needs_image);
        const noImageDiseases = results.filter(d => !d.needs_image);

        // Generate follow-up questions
        const qs = generateQuestions(results);
        setQuestions(qs);
        setCurrentQIdx(0);
        setQuestionAnswers({});

        setStep(STEPS.NARROWING);
    };

    // Step 3: Answer follow-up questions
    const handleAnswerQuestion = (symptom, answer) => {
        const newAnswers = { ...questionAnswers, [symptom]: answer };
        setQuestionAnswers(newAnswers);

        if (currentQIdx < questions.length - 1) {
            setCurrentQIdx(currentQIdx + 1);
        } else {
            // Recalculate scores with answers
            const refined = candidates.map(d => {
                let bonus = 0;
                for (const [sym, ans] of Object.entries(newAnswers)) {
                    if (ans && d.unmatched.includes(sym)) bonus += 1;
                    if (!ans && d.matched.includes(sym)) bonus -= 0.5;
                }
                return { ...d, finalScore: d.score + bonus };
            }).sort((a, b) => b.finalScore - a.finalScore);

            setCandidates(refined);

            // Check if top diseases need image
            const topNeedsImage = refined.slice(0, 3).filter(d => d.needs_image);
            if (topNeedsImage.length > 0) {
                setStep(STEPS.IMAGE_CONFIRM);
            } else {
                setSelectedDisease(refined[0]);
                setStep(STEPS.RESULT);
            }
        }
    };

    // Step 4: Select disease from results
    const handleSelectDisease = (disease) => {
        setSelectedDisease(disease);
        setStep(STEPS.RESULT);
    };

    // Reset
    const handleReset = () => {
        setStep(STEPS.PET);
        setSelectedPet(null);
        setSymptomInput('');
        setCandidates([]);
        setQuestions([]);
        setQuestionAnswers({});
        setCurrentQIdx(0);
        setSelectedDisease(null);
    };

    const handleBack = () => {
        if (step === STEPS.SYMPTOMS) setStep(STEPS.PET);
        else if (step === STEPS.NARROWING) setStep(STEPS.SYMPTOMS);
        else if (step === STEPS.QUESTIONS) setStep(STEPS.NARROWING);
        else if (step === STEPS.IMAGE_CONFIRM) setStep(STEPS.NARROWING);
        else if (step === STEPS.RESULT) {
            if (candidates.length > 0) setStep(STEPS.NARROWING);
            else setStep(STEPS.SYMPTOMS);
        }
    };

    return (
        <div className="diagnose-page">
            <h2>🩺 Chẩn Đoán Thú Cưng</h2>

            {/* Progress bar */}
            <div className="diag-progress">
                {['Loài', 'Triệu chứng', 'Khoanh vùng', 'Kết quả'].map((label, i) => {
                    const stepOrder = [STEPS.PET, STEPS.SYMPTOMS, STEPS.NARROWING, STEPS.RESULT];
                    const currentIdx = stepOrder.indexOf(step);
                    const isActive = i <= (currentIdx >= 0 ? currentIdx : 0);
                    return (
                        <div key={i} className={`diag-step ${isActive ? 'active' : ''}`}>
                            <div className="diag-step-dot">{i + 1}</div>
                            <span>{label}</span>
                        </div>
                    );
                })}
            </div>

            {step !== STEPS.PET && (
                <button className="btn-back" onClick={handleBack}>← Quay lại</button>
            )}

            {/* STEP 1: Choose pet */}
            {step === STEPS.PET && (
                <div className="diag-section">
                    <p className="step-hint">Thú cưng của bạn là?</p>
                    <div className="pet-select-grid">
                        {PET_TYPES.map(p => (
                            <button
                                key={p.id}
                                className="pet-card"
                                onClick={() => handleSelectPet(p.id)}
                            >
                                <span className="pet-emoji">{p.emoji}</span>
                                <span className="pet-label">{p.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: Input symptoms */}
            {step === STEPS.SYMPTOMS && (
                <div className="diag-section">
                    <p className="step-hint">
                        Chọn các triệu chứng mà bé đang gặp phải:
                    </p>

                    {/* Selected Symptoms */}
                    <div className="selected-symptoms mb-3">
                        {symptomInput.split(',').filter(Boolean).map(s => (
                            <span key={s} className="symptom-tag selected">
                                {s.trim()}
                                <button
                                    className="remove-tag"
                                    onClick={() => {
                                        const current = symptomInput.split(',').map(x => x.trim()).filter(Boolean);
                                        setSymptomInput(current.filter(x => x !== s.trim()).join(', '));
                                    }}
                                >×</button>
                            </span>
                        ))}
                    </div>

                    {/* Search and Pick */}
                    <div className="symptom-search-box">
                        <input
                            type="text"
                            className="symptom-search-input"
                            placeholder="🔍 Tìm nhanh triệu chứng..."
                            onChange={e => {
                                const val = e.target.value.toLowerCase();
                                const box = document.getElementById('symptom-options-box');
                                if (box) {
                                    Array.from(box.children).forEach(child => {
                                        const isMatch = child.textContent.toLowerCase().includes(val);
                                        child.style.display = isMatch ? 'inline-block' : 'none';
                                    });
                                }
                            }}
                        />
                        <div id="symptom-options-box" className="symptom-options">
                            {["đau đớn", "nôn mửa", "chán ăn", "tiêu chảy", "mệt mỏi", "yếu ớt", "có khối u", "thiếu máu", "bướu", "sốt", "phù nề", "sụt cân", "co giật", "mất nước", "xuất huyết", "ngất xỉu", "mất thăng bằng", "rối loạn nhịp tim", "khó thở", "lở loét", "ủ rũ", "thở nhanh", "nhịp tim nhanh", "tiểu nhiều", "uống nhiều nước", "ban đỏ", "sưng tấy", "tăng ure máu", "liệt", "áp xe", "viêm da", "tiểu ra máu", "trào ngược", "đi khập khiễng", "ho", "rụng lông", "đau bụng", "hạ đường huyết", "báng bụng (tích dịch)", "viêm kết mạc", "phân đen", "nhịp tim chậm", "viêm màng bồ đào", "yếu liệt", "ngứa ngáy", "nổi hạt sần", "tiếng thổi ở tim", "run rẩy", "ngất", "viêm da mủ", "sưng hạch bạch huyết", "tổn thương da", "tăng canxi máu", "chảy nước mũi", "mù lòa", "suy hô hấp", "hắt hơi", "són tiểu", "teo cơ", "gan to", "tiểu buốt", "đi ngoài ra máu", "táo bón", "lỗ rò", "ăn nhiều một cách bất thường", "tím tái", "vàng màng nhầy", "vàng da", "đi vòng tròn", "tiểu rắt", "đóng vảy", "mót rặn", "lách to", "hôi miệng", "bong vảy", "rung giật nhãn cầu", "nghiêng đầu", "cứng khớp", "nôn ra máu", "chảy nước mắt", "xuất huyết lốm đốm", "phân lẫn mỡ", "sưng khớp", "đầy hơi", "chà xát mông xuống đất"].map(s => {
                                const isSelected = symptomInput.split(',').map(x => x.trim()).includes(s);
                                if (isSelected) return null;
                                return (
                                    <button
                                        key={s}
                                        className="symptom-chip outline"
                                        onClick={() => {
                                            const current = symptomInput.trim();
                                            setSymptomInput(current ? `${current}, ${s}` : s);
                                            // Reset search
                                            const input = document.querySelector('.symptom-search-input');
                                            if (input) input.value = '';
                                            const box = document.getElementById('symptom-options-box');
                                            if (box) Array.from(box.children).forEach(c => c.style.display = 'inline-block');
                                        }}
                                    >
                                        + {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                        onClick={handleSubmitSymptoms}
                        disabled={!symptomInput.trim()}
                    >
                        🔍 Tra cứu bệnh
                    </button>
                </div>
            )}

            {/* STEP 3: Narrowing results + Questions */}
            {step === STEPS.NARROWING && (
                <div className="diag-section">
                    <p className="step-hint">
                        Tìm thấy {candidates.length} bệnh có thể liên quan
                    </p>

                    {/* Follow-up questions */}
                    {questions.length > 0 && currentQIdx < questions.length && (
                        <div className="question-card" style={{ marginBottom: '1rem' }}>
                            <div className="question-counter">
                                Câu hỏi {currentQIdx + 1}/{questions.length}
                            </div>
                            <p className="question-text">
                                Thú cưng có bị <strong>{questions[currentQIdx].symptom}</strong> không?
                            </p>
                            <div className="question-buttons">
                                <button
                                    className="btn-yes"
                                    onClick={() => handleAnswerQuestion(questions[currentQIdx].symptom, true)}
                                >
                                    ✓ Có
                                </button>
                                <button
                                    className="btn-no"
                                    onClick={() => handleAnswerQuestion(questions[currentQIdx].symptom, false)}
                                >
                                    ✕ Không
                                </button>
                                <button
                                    className="btn-skip"
                                    onClick={() => handleAnswerQuestion(questions[currentQIdx].symptom, null)}
                                >
                                    ↷ Không rõ
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Disease list */}
                    <h3 className="narrowing-title">📋 Bệnh có thể:</h3>
                    <div className="candidate-list">
                        {candidates.slice(0, 10).map((d, i) => {
                            const sev = getSeverityInfo(d.severity_score || 5);
                            return (
                                <button
                                    key={i}
                                    className="candidate-card"
                                    onClick={() => handleSelectDisease(d)}
                                >
                                    <div className="cand-header">
                                        <span className="cand-rank">#{i + 1}</span>
                                        <span className="cand-name">
                                            {d.disease_name_vi || d.disease_name}
                                        </span>
                                        <span className="cand-severity" style={{ color: sev.color }}>
                                            {sev.icon}
                                        </span>
                                    </div>
                                    <div className="cand-meta">
                                        <span>Khớp: {d.score} triệu chứng</span>
                                        {d.needs_image && <span className="cand-image-tag">📷 Cần ảnh</span>}
                                    </div>
                                    {d.summary_vi && (
                                        <p className="cand-summary">{d.summary_vi.slice(0, 100)}...</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* STEP 4: Image confirmation */}
            {step === STEPS.IMAGE_CONFIRM && (
                <div className="diag-section">
                    <p className="step-hint">
                        Các bệnh sau cần xác nhận bằng ảnh. Hãy chọn bệnh phù hợp nhất:
                    </p>
                    <div className="candidate-list">
                        {candidates.filter(d => d.needs_image).slice(0, 5).map((d, i) => {
                            const sev = getSeverityInfo(d.severity_score || 5);
                            return (
                                <button
                                    key={i}
                                    className="candidate-card image-card"
                                    onClick={() => handleSelectDisease(d)}
                                >
                                    <div className="cand-header">
                                        <span className="cand-name">
                                            {d.disease_name_vi || d.disease_name}
                                        </span>
                                        <span className="cand-severity" style={{ color: sev.color }}>
                                            {sev.icon} {sev.label}
                                        </span>
                                    </div>
                                    <div className="cand-meta">
                                        <span>📷 Loại ảnh: {d.image_type || 'Photo'}</span>
                                        <span>Khớp: {d.score} triệu chứng</span>
                                    </div>
                                    {d.summary_vi && (
                                        <p className="cand-summary">{d.summary_vi}</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        className="btn-back"
                        style={{ marginTop: '1rem' }}
                        onClick={() => {
                            // Skip image diseases and go to non-image result
                            const noImg = candidates.filter(d => !d.needs_image);
                            if (noImg.length > 0) {
                                setSelectedDisease(noImg[0]);
                                setStep(STEPS.RESULT);
                            }
                        }}
                    >
                        Bỏ qua (xem bệnh không cần ảnh)
                    </button>
                </div>
            )}

            {/* STEP 5: Result */}
            {step === STEPS.RESULT && (
                <div className="diag-section">
                    {!selectedDisease && candidates.length === 0 ? (
                        <div className="no-result">
                            <p className="no-result-icon">😔</p>
                            <p>Không tìm thấy bệnh phù hợp với triệu chứng đã nhập.</p>
                            <p className="text-muted">Hãy thử nhập thêm triệu chứng hoặc mô tả chi tiết hơn.</p>
                            <button className="btn-primary" onClick={handleReset}>
                                🔄 Thử lại
                            </button>
                        </div>
                    ) : selectedDisease ? (
                        <DiseaseDetail disease={selectedDisease} onBack={handleReset} />
                    ) : (
                        <div>
                            <p>Chọn bệnh để xem chi tiết:</p>
                            {candidates.slice(0, 5).map((d, i) => (
                                <button
                                    key={i}
                                    className="candidate-card"
                                    onClick={() => handleSelectDisease(d)}
                                >
                                    <span>{d.disease_name_vi || d.disease_name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Disease Detail Component ── */
function DiseaseDetail({ disease, onBack }) {
    const sev = getSeverityInfo(disease.severity_score || 5);
    const nutrition = disease.nutrition_advice || {};

    return (
        <div className="disease-detail">
            <div className="disease-header">
                <h2>{disease.disease_name_vi || disease.disease_name}</h2>
                <p className="disease-name-en">{disease.disease_name}</p>
                <div className="disease-badges">
                    <span className="badge" style={{ background: sev.color }}>
                        {sev.icon} {sev.label} ({disease.severity_score}/10)
                    </span>
                    {disease.species && (
                        <span className="badge badge-species">
                            {disease.species === 'Dog' ? '🐕' : disease.species === 'Cat' ? '🐈' : '🐾'} {disease.species}
                        </span>
                    )}
                    {disease.needs_image && (
                        <span className="badge badge-image">📷 {disease.image_type || 'Photo'}</span>
                    )}
                </div>
            </div>

            {disease.summary_vi && (
                <div className="detail-section">
                    <h3>📝 Tóm tắt</h3>
                    <p>{disease.summary_vi}</p>
                </div>
            )}

            {disease.symptom_keywords && disease.symptom_keywords.length > 0 && (
                <div className="detail-section">
                    <h3>⚡ Triệu chứng chính</h3>
                    <div className="symptom-chips">
                        {disease.symptom_keywords.map((s, i) => (
                            <span key={i} className={`symptom-chip ${disease.matched?.includes(s) ? 'matched' : ''}`}>
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {nutrition.summary_vi && (
                <div className="detail-section nutrition-section">
                    <h3>🥗 Chế độ dinh dưỡng</h3>
                    <p className="nutrition-summary">{nutrition.summary_vi}</p>

                    {nutrition.should_eat && nutrition.should_eat.length > 0 && (
                        <div className="nutrition-list">
                            <h4>✅ Nên ăn:</h4>
                            <ul>
                                {nutrition.should_eat.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {nutrition.avoid && nutrition.avoid.length > 0 && (
                        <div className="nutrition-list">
                            <h4>❌ Tránh:</h4>
                            <ul>
                                {nutrition.avoid.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {nutrition.key_nutrients && nutrition.key_nutrients.length > 0 && (
                        <div className="nutrition-list">
                            <h4>💊 Dưỡng chất quan trọng:</h4>
                            <ul>
                                {nutrition.key_nutrients.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {nutrition.product_suggestion_vi && (
                        <div className="product-suggestion">
                            <h4>🛒 Gợi ý sản phẩm:</h4>
                            <p>{nutrition.product_suggestion_vi}</p>
                        </div>
                    )}
                </div>
            )}

            <AffiliateCompare
                species={disease.species}
                nameEn={disease.disease_name}
                nameVi={disease.disease_name_vi || disease.disease_name}
                advice={disease.nutrition_advice}
            />

            {disease.common_breeds && disease.common_breeds.length > 0 && (
                <div className="detail-section">
                    <h3>🐾 Giống hay mắc</h3>
                    <div className="breed-chips">
                        {disease.common_breeds.map((b, i) => (
                            <span key={i} className="breed-chip">{b}</span>
                        ))}
                    </div>
                </div>
            )}

            {disease.source_page && (
                <div className="reference-section" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(129, 140, 248, 0.05)', borderRadius: 'var(--radius)', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        <strong>📚 Nguồn tham khảo:</strong> <i>Blackwell's Five-Minute Veterinary Consult: Canine and Feline (7th Edition)</i>, Trang {disease.source_page}
                    </p>
                </div>
            )}

            <div className="result-actions">
                <button className="btn-primary" onClick={onBack}>
                    🔄 Chẩn đoán mới
                </button>
            </div>

            <div className="disclaimer-box">
                <p>⚠️ Kết quả chỉ mang tính tham khảo. Hãy đưa thú cưng đến bác sĩ thú y để được chẩn đoán chính xác.</p>
            </div>
        </div>
    );
}
