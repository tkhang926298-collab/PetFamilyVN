import { useState } from 'react';
import { submitFeedback } from '../services/api';

export default function FeedbackForm({ diagnoseId }) {
    const [content, setContent] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            setError('Vui lòng nhập nội dung góp ý');
            return;
        }
        try {
            await submitFeedback(diagnoseId || 0, content);
            setSubmitted(true);
            setContent('');
            setError('');
        } catch {
            setError('Gửi thất bại, vui lòng thử lại');
        }
    };

    if (submitted) {
        return (
            <div className="feedback-form success">
                <p>✅ Cảm ơn bạn đã góp ý! Chúng tôi sẽ cải thiện dựa trên ý kiến của bạn.</p>
            </div>
        );
    }

    return (
        <form className="feedback-form" onSubmit={handleSubmit}>
            <h3>📝 Góp Ý</h3>
            <p className="text-muted">Kết quả có chính xác không? Bạn có góp ý gì cho chúng tôi?</p>
            <textarea
                className="feedback-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập góp ý của bạn..."
                rows={3}
            />
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn-secondary">Gửi Góp Ý</button>
        </form>
    );
}
