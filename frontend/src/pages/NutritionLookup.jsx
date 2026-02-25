import { useState, useMemo } from 'react';
import diseasesData from '../data/diseases.json';
import breedNutrition from '../data/breed_nutrition.json';
import AffiliateCompare from '../components/AffiliateCompare';

const BODY_CONDITIONS = [
    {
        id: 'underweight',
        label: 'Gầy / Thiếu cân',
        emoji: '🦴',
        advice: {
            summary_vi: 'Thú cưng thiếu cân cần chế độ ăn giàu calo và protein chất lượng cao để tăng cân khỏe mạnh.',
            should_eat: [
                'Thức ăn hạt cao năng lượng (>380 kcal/cup) với protein >30%',
                'Thức ăn ẩm (pate) giàu thịt thật để kích thích ăn',
                'Bổ sung dầu cá (Omega-3, 6) để tăng calo và cải thiện lông',
                'Trứng luộc chín: nguồn protein dễ tiêu, 1-2 quả/tuần',
                'Thịt gà/bò luộc không gia vị trộn cùng thức ăn hạt',
                'Cho ăn nhiều bữa nhỏ (3-4 bữa/ngày thay vì 2 bữa)',
            ],
            avoid: [
                'Tránh thức ăn nhiều chất xơ (gây no nhanh mà ít calo)',
                'Tránh thay đổi thức ăn đột ngột (gây tiêu chảy)',
                'Không cho ăn thức ăn người (chứa gia vị, muối)',
                'Tránh tập thể dục quá mức khi đang tăng cân',
            ],
            key_nutrients: [
                'Protein cao (>30%): xây dựng cơ bắp',
                'Chất béo lành mạnh (15-20%): nguồn năng lượng đậm đặc',
                'Vitamin B complex: kích thích ăn ngon',
                'L-Carnitine: hỗ trợ chuyển hóa chất béo thành năng lượng',
            ],
            product_suggestion_vi: 'Nên chọn hạt "High Energy" hoặc "Puppy/Kitten" (calo cao hơn Adult). Ví dụ: Royal Canin Gastrointestinal High Energy, Hill\'s a/d Critical Care, Orijen Puppy.',
        },
    },
    {
        id: 'overweight',
        label: 'Béo / Thừa cân',
        emoji: '🐷',
        advice: {
            summary_vi: 'Thú cưng thừa cân cần giảm calo từ từ, tăng protein để giữ cơ, và tăng vận động hợp lý.',
            should_eat: [
                'Thức ăn hạt "Weight Management" hoặc "Light" (<300 kcal/cup)',
                'Rau luộc (bí đỏ, cà rốt, đậu xanh) trộn cùng hạt để tăng no',
                'Thức ăn giàu protein (>35%) và ít chất béo (<10%)',
                'Cho ăn đúng liều lượng theo bảng hướng dẫn trên bao bì',
                'Sử dụng bát ăn chậm (slow feeder) để giảm tốc độ ăn',
                'Chia nhỏ bữa ăn (3 bữa/ngày)',
            ],
            avoid: [
                'TUYỆT ĐỐI không cho ăn vặt, snack thừa bàn ăn',
                'Tránh thức ăn nhiều carbohydrate (ngô, lúa mì, gạo)',
                'Không giảm calo quá nhanh (>2% trọng lượng/tuần)',
                'Tránh thức ăn chứa đường hoặc chất béo bão hòa',
            ],
            key_nutrients: [
                'L-Carnitine: đốt cháy mỡ thừa hiệu quả',
                'Protein cao (>35%): duy trì cơ bắp khi giảm cân',
                'Chất xơ hòa tan: tạo cảm giác no lâu',
                'Glucosamine: bảo vệ khớp (béo phì tăng áp lực khớp)',
            ],
            product_suggestion_vi: 'Nên chọn hạt "Weight Control" hoặc "Metabolic". Ví dụ: Hill\'s Metabolic, Royal Canin Satiety Weight Management, Blue Buffalo Healthy Weight.',
        },
    },
    {
        id: 'normal',
        label: 'Bình thường',
        emoji: '💪',
        advice: {
            summary_vi: 'Thú cưng khỏe mạnh cần duy trì chế độ ăn cân bằng với đầy đủ dinh dưỡng theo từng giai đoạn tuổi.',
            should_eat: [
                'Thức ăn hạt chất lượng cao phù hợp lứa tuổi (Puppy/Adult/Senior)',
                'Thành phần đầu tiên phải là thịt thật (gà, bò, cá)',
                'Bổ sung Omega-3 từ dầu cá 1-2 lần/tuần',
                'Rau quả an toàn làm snack: cà rốt, blueberry, dưa hấu',
                'Nước sạch luôn có sẵn, thay mới mỗi ngày',
                'Cho ăn 2 bữa/ngày đúng giờ cố định',
            ],
            avoid: [
                'Tránh thức ăn người có gia vị, muối, đường',
                'Không cho ăn xương nấu chín (gẫy nhọn)',
                'Tránh sô cô la, nho, hành, tỏi, xylitol',
                'Không cho ăn thừa thãi (theo bảng cân nặng)',
            ],
            key_nutrients: [
                'Protein (25-30%): duy trì cơ bắp và hệ miễn dịch',
                'Chất béo (12-18%): năng lượng và da lông đẹp',
                'Omega-3 & 6: chống viêm, da lông bóng mượt',
                'Taurine (quan trọng cho mèo): bảo vệ tim và mắt',
            ],
            product_suggestion_vi: 'Nên chọn hạt "All Life Stages" hoặc "Adult Maintenance". Ví dụ: Royal Canin Size Health, Hill\'s Science Diet, Acana Classics.',
        },
    },
];

export default function NutritionLookup() {
    const [mode, setMode] = useState('breed'); // breed | disease | condition
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDisease, setSelectedDisease] = useState(null);
    const [selectedPet, setSelectedPet] = useState(null);
    const [selectedCondition, setSelectedCondition] = useState(null);
    // Breed mode states
    const [breedPet, setBreedPet] = useState(null); // 'cat' | 'dog'
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedStageIdx, setSelectedStageIdx] = useState(null);

    // Search diseases with nutrition_advice
    const searchResults = useMemo(() => {
        if (mode !== 'disease' || searchTerm.length < 2) return [];
        return diseasesData.filter(d => {
            const hasNutrition = d.nutrition_advice && d.nutrition_advice.summary_vi;
            const matchSearch =
                (d.disease_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.disease_name_vi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.summary_vi || '').toLowerCase().includes(searchTerm.toLowerCase());
            return hasNutrition && matchSearch;
        });
    }, [searchTerm, mode]);

    const handleSelectDisease = (d) => { setSelectedDisease(d); };

    const handleBack = () => {
        setSelectedDisease(null);
        setSelectedCondition(null);
        setSelectedPet(null);
        setSelectedGroup(null);
        setSelectedStageIdx(null);
        setBreedPet(null);
    };

    const conditionAdvice = selectedCondition
        ? BODY_CONDITIONS.find(c => c.id === selectedCondition)?.advice
        : null;

    // Breed groups
    const breedGroups = breedPet ? breedNutrition[breedPet] || [] : [];

    return (
        <div className="nutrition-page">
            <h2>🥗 Tra Cứu Dinh Dưỡng</h2>
            <p className="step-hint">Tư vấn dinh dưỡng theo giống, bệnh lý hoặc thể trạng</p>

            {/* Mode tabs */}
            <div className="nutrition-tabs">
                <button
                    className={`nutrition-tab ${mode === 'breed' ? 'active' : ''}`}
                    onClick={() => { setMode('breed'); handleBack(); setSearchTerm(''); }}
                >
                    🐾 Theo Giống
                </button>
                <button
                    className={`nutrition-tab ${mode === 'disease' ? 'active' : ''}`}
                    onClick={() => { setMode('disease'); handleBack(); }}
                >
                    🩺 Theo Bệnh
                </button>
                <button
                    className={`nutrition-tab ${mode === 'condition' ? 'active' : ''}`}
                    onClick={() => { setMode('condition'); handleBack(); setSearchTerm(''); }}
                >
                    ⚖️ Theo Thể Trạng
                </button>
            </div>

            {/* ══════ MODE: Breed ══════ */}
            {mode === 'breed' && !selectedGroup && (
                <div className="condition-section">
                    {/* Step 1: Pet selection */}
                    {!breedPet && (
                        <>
                            <h3>🐾 Chọn loại thú cưng</h3>
                            <div className="animal-grid">
                                <button className="animal-card" onClick={() => setBreedPet('cat')}>
                                    <span className="animal-emoji">🐈</span>
                                    <span className="animal-name">Mèo</span>
                                    <span className="animal-count">{breedNutrition.cat.length} nhóm giống</span>
                                </button>
                                <button className="animal-card" onClick={() => setBreedPet('dog')}>
                                    <span className="animal-emoji">🐕</span>
                                    <span className="animal-name">Chó</span>
                                    <span className="animal-count">{breedNutrition.dog.length} nhóm giống</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Step 2: Group selection */}
                    {breedPet && (
                        <>
                            <h3>{breedPet === 'cat' ? '🐈 Chọn nhóm giống mèo' : '🐕 Chọn nhóm giống chó'}</h3>
                            <div className="breed-group-list">
                                {breedGroups.map((g, i) => (
                                    <button key={i} className="breed-group-card" onClick={() => { setSelectedGroup(g); setSelectedStageIdx(null); }}>
                                        <span className="breed-group-emoji">{g.emoji}</span>
                                        <div className="breed-group-info">
                                            <strong>{g.group}</strong>
                                            <span className="breed-group-weight">⚖️ {g.weight}</span>
                                            <span className="breed-group-breeds">{g.breeds}</span>
                                            <span className="breed-group-desc">{g.description}</span>
                                        </div>
                                        <span className="tip-chevron">▶</span>
                                    </button>
                                ))}
                            </div>
                            <button className="btn-back" onClick={() => setBreedPet(null)}>← Chọn lại</button>
                        </>
                    )}
                </div>
            )}

            {/* Breed Group Detail */}
            {mode === 'breed' && selectedGroup && (
                <div className="breed-detail-section">
                    <div className="breed-detail-header">
                        <span className="breed-detail-emoji">{selectedGroup.emoji}</span>
                        <div>
                            <h3>{selectedGroup.group}</h3>
                            <p className="breed-detail-breeds">{selectedGroup.breeds}</p>
                            <p className="breed-detail-weight">⚖️ {selectedGroup.weight} · {selectedGroup.description}</p>
                        </div>
                    </div>

                    {/* Stage tabs */}
                    <div className="stage-tabs">
                        {selectedGroup.stages.map((s, i) => (
                            <button
                                key={i}
                                className={`stage-tab ${selectedStageIdx === i ? 'active' : ''}`}
                                onClick={() => setSelectedStageIdx(selectedStageIdx === i ? null : i)}
                            >
                                {s.stage}
                            </button>
                        ))}
                    </div>

                    {/* Stage detail */}
                    {selectedStageIdx !== null && selectedGroup.stages[selectedStageIdx] && (
                        <BreedStageCard stage={selectedGroup.stages[selectedStageIdx]} />
                    )}

                    {/* General tips */}
                    <div className="mt-4">
                        <AffiliateCompare
                            species={breedPet === 'cat' ? 'Cat' : 'Dog'}
                            nameEn={selectedGroup.group}
                            nameVi={selectedGroup.group}
                            advice={{ product_suggestion_vi: selectedGroup.product_suggestion }}
                        />
                    </div>

                    {/* General nutrition tips */}
                    <div className="conclusion-section" style={{ borderLeftColor: '#6366F1', marginTop: '0.75rem' }}>
                        <h3>📋 Hướng Dẫn Chung</h3>
                        <ul className="nutrition-list">
                            {breedNutrition.general_tips.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                    </div>

                    <button className="btn-back" onClick={() => { setSelectedGroup(null); setSelectedStageIdx(null); }}>← Quay lại chọn giống</button>
                </div>
            )}

            {/* ══════ MODE: Disease search ══════ */}
            {mode === 'disease' && !selectedDisease && (
                <div className="nutrition-search-section">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="🔎 Nhập tên bệnh (VN hoặc EN)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm.length >= 2 && (
                        <p className="step-hint">Tìm thấy {searchResults.length} bệnh có tư vấn dinh dưỡng</p>
                    )}
                    <div className="disease-list">
                        {searchResults.map((d, i) => (
                            <button key={i} className="disease-card nutrition-card" onClick={() => handleSelectDisease(d)}>
                                <h3 className="disease-card-name">{d.disease_name_vi || d.disease_name}</h3>
                                {d.disease_name_vi && <p className="disease-card-en">{d.disease_name}</p>}
                                {d.nutrition_advice?.summary_vi && (
                                    <p className="disease-card-summary">🍽️ {d.nutrition_advice.summary_vi.substring(0, 80)}...</p>
                                )}
                            </button>
                        ))}
                        {searchTerm.length >= 2 && searchResults.length === 0 && (
                            <p className="no-results">Không tìm thấy bệnh có tư vấn dinh dưỡng. Thử từ khóa khác.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Disease detail */}
            {mode === 'disease' && selectedDisease && (
                <NutritionAdviceCard
                    species={selectedDisease.species}
                    title={selectedDisease.disease_name_vi || selectedDisease.disease_name}
                    subtitle={selectedDisease.disease_name_vi ? selectedDisease.disease_name : null}
                    advice={selectedDisease.nutrition_advice}
                    onBack={handleBack}
                />
            )}

            {/* ══════ MODE: Body condition ══════ */}
            {mode === 'condition' && !selectedCondition && (
                <div className="condition-section">
                    {!selectedPet && (
                        <>
                            <h3>🐾 Chọn loại thú cưng</h3>
                            <div className="animal-grid">
                                <button className="animal-card" onClick={() => setSelectedPet('dog')}>
                                    <span className="animal-emoji">🐕</span>
                                    <span className="animal-name">Chó</span>
                                </button>
                                <button className="animal-card" onClick={() => setSelectedPet('cat')}>
                                    <span className="animal-emoji">🐈</span>
                                    <span className="animal-name">Mèo</span>
                                </button>
                            </div>
                        </>
                    )}
                    {selectedPet && (
                        <>
                            <h3>⚖️ Tình trạng thể trạng của {selectedPet === 'dog' ? '🐕 Chó' : '🐈 Mèo'}</h3>
                            <div className="condition-grid">
                                {BODY_CONDITIONS.map(c => (
                                    <button key={c.id} className="condition-card" onClick={() => setSelectedCondition(c.id)}>
                                        <span className="condition-emoji">{c.emoji}</span>
                                        <span className="condition-label">{c.label}</span>
                                    </button>
                                ))}
                            </div>
                            <button className="btn-back" onClick={() => setSelectedPet(null)}>← Chọn lại thú cưng</button>
                        </>
                    )}
                </div>
            )}

            {/* Condition advice */}
            {mode === 'condition' && selectedCondition && conditionAdvice && (
                <NutritionAdviceCard
                    species={selectedPet === 'dog' ? 'Dog' : 'Cat'}
                    title={`${selectedPet === 'dog' ? '🐕 Chó' : '🐈 Mèo'} — ${BODY_CONDITIONS.find(c => c.id === selectedCondition)?.label}`}
                    advice={conditionAdvice}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}

/* ── Breed Stage Detail Card ── */
function BreedStageCard({ stage }) {
    return (
        <div className="breed-stage-card">
            <h4 className="stage-title">📊 {stage.stage}</h4>

            <div className="stage-stats">
                <div className="stat-item">
                    <span className="stat-icon">🔥</span>
                    <div>
                        <span className="stat-label">Calo/ngày</span>
                        <strong className="stat-value">{stage.calories}</strong>
                    </div>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">💪</span>
                    <div>
                        <span className="stat-label">Đạm/ngày</span>
                        <strong className="stat-value">{stage.protein}</strong>
                    </div>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">🥣</span>
                    <div>
                        <span className="stat-label">Hạt khô</span>
                        <strong className="stat-value">{stage.dry_food}</strong>
                    </div>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">🥫</span>
                    <div>
                        <span className="stat-label">Thức ăn ướt</span>
                        <strong className="stat-value">{stage.wet_food}</strong>
                    </div>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">🍽️</span>
                    <div>
                        <span className="stat-label">Số bữa</span>
                        <strong className="stat-value">{stage.meals}</strong>
                    </div>
                </div>
            </div>

            {stage.tips?.length > 0 && (
                <div className="stage-tips">
                    <h4>💡 Lưu Ý</h4>
                    <ul className="nutrition-list">
                        {stage.tips.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ── Reusable Nutrition Advice Card ── */
function NutritionAdviceCard({ species, title, subtitle, advice, onBack }) {
    if (!advice) return null;
    const na = advice;

    return (
        <div className="conclusion-card nutrition-detail">
            <h2 className="disease-name">{title}</h2>
            {subtitle && <p className="disease-name-en">🇬🇧 {subtitle}</p>}

            {na.summary_vi && (
                <div className="conclusion-section" style={{ borderLeftColor: '#22C55E' }}>
                    <h3>🍽️ Tổng Quan Dinh Dưỡng</h3>
                    <p>{na.summary_vi}</p>
                </div>
            )}

            {na.should_eat?.length > 0 && (
                <div className="conclusion-section" style={{ borderLeftColor: '#22C55E' }}>
                    <h3>✅ Nên Ăn / Nên Dùng</h3>
                    <ul className="nutrition-list">
                        {na.should_eat.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            )}

            {na.avoid?.length > 0 && (
                <div className="conclusion-section" style={{ borderLeftColor: '#EF4444' }}>
                    <h3>❌ Nên Tránh</h3>
                    <ul className="nutrition-list avoid">
                        {na.avoid.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            )}

            {na.key_nutrients?.length > 0 && (
                <div className="conclusion-section" style={{ borderLeftColor: '#6366F1' }}>
                    <h3>🧪 Dưỡng Chất Quan Trọng</h3>
                    <ul className="nutrition-list nutrients">
                        {na.key_nutrients.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            )}

            <div className="mt-4">
                <AffiliateCompare
                    species={species}
                    nameEn={subtitle || title}
                    nameVi={title}
                    advice={na}
                />
            </div>

            <div className="conclusion-actions">
                <button className="btn-back" onClick={onBack}>← Quay lại</button>
            </div>
        </div>
    );
}
