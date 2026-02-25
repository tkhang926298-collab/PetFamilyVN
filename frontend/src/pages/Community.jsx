import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { uploadToImgBB } from '../services/imgbb';
import LazyImage from '../components/LazyImage';

// Admin detection: user must have is_admin: true in Supabase user_metadata
// Set via Admin Tool or Supabase Dashboard → Authentication → Users → Edit metadata
const MAX_IMAGES_PER_DAY = 10;

const PET_TYPES = [
    { id: 'general', label: '🌐 Chung', color: '#6366F1' },
    { id: 'dog', label: '🐕 Chó', color: '#F59E0B' },
    { id: 'cat', label: '🐈 Mèo', color: '#EC4899' },
];

const CATEGORIES = [
    { id: 'question', label: '❓ Hỏi đáp', color: '#3B82F6' },
    { id: 'share', label: '📖 Chia sẻ', color: '#22C55E' },
    { id: 'guide', label: '📋 Hướng dẫn', color: '#F59E0B' },
];

const FB_TYPES = [
    { id: 'suggestion', label: '💡 Góp ý', color: '#6366F1' },
    { id: 'bug', label: '🐛 Báo lỗi', color: '#EF4444' },
    { id: 'other', label: '📝 Khác', color: '#F59E0B' },
];

const STICKERS = ['❤️', '👍', '😂', '😢', '🐶', '🐱', '🐾', '🎉', '🔥', '💯', '🙏', '👋'];

export default function Community() {
    const [tab, setTab] = useState('forum'); // forum | feedback | messages
    const [view, setView] = useState('list'); // list | create | detail | chat

    // Forum state
    const [topics, setTopics] = useState([]);
    const [topicFilter, setTopicFilter] = useState('all'); // all | dog | cat | general
    const [catFilter, setCatFilter] = useState('all'); // all | question | share | guide
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [comments, setComments] = useState([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);

    // Create topic state
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newPetType, setNewPetType] = useState('general');
    const [newCategory, setNewCategory] = useState('question');
    const [newImage, setNewImage] = useState(null);
    const [newImagePreview, setNewImagePreview] = useState(null);
    const [creating, setCreating] = useState(false);

    // Comment state
    const [newComment, setNewComment] = useState('');
    const [commentImage, setCommentImage] = useState(null);
    const [commentImagePreview, setCommentImagePreview] = useState(null);
    const [commenting, setCommenting] = useState(false);

    // Feedback state
    const [fbType, setFbType] = useState('suggestion');
    const [fbContent, setFbContent] = useState('');
    const [fbSubmitted, setFbSubmitted] = useState(false);
    const [feedbackList, setFeedbackList] = useState([]);
    const [loadingFeedback, setLoadingFeedback] = useState(true);

    // Profiles mapping: { userId: avatar_url }
    const [profilesMap, setProfilesMap] = useState({});

    // Messaging state
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [msgImage, setMsgImage] = useState(null);
    const [msgImagePreview, setMsgImagePreview] = useState(null);
    const [showStickers, setShowStickers] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Profile popup
    const [profilePopup, setProfilePopup] = useState(null);

    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setCurrentUser(user);
            // Admin = is_admin flag in user_metadata (set by Admin Tool or Supabase Dashboard)
            const meta = user?.user_metadata || {};
            setIsAdmin(meta.is_admin === true);
        });
    }, []);

    useEffect(() => {
        if (tab === 'forum') loadTopics();
        if (tab === 'feedback') loadFeedback();
        if (tab === 'messages') loadConversations();
        loadProfilesMap();
    }, [tab]);

    const loadProfilesMap = async () => {
        try {
            const { data } = await supabase.from('profiles').select('id, avatar_url, display_name');
            const map = {};
            (data || []).forEach(p => {
                map[p.id] = p;
            });
            setProfilesMap(map);
        } catch { /* silent */ }
    };

    // ── TOPIC FUNCTIONS ──
    const loadTopics = async () => {
        setLoadingTopics(true);
        try {
            const { data, error: err } = await supabase
                .from('forum_topics')
                .select('*')
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50);
            if (err) throw err;
            setTopics(data || []);
        } catch (err) {
            console.log('Forum not ready:', err.message);
            setTopics([]);
        }
        setLoadingTopics(false);
    };

    const handleImageSelect = (e, setter, previewSetter) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('Ảnh tối đa 5MB');
            return;
        }
        setter(file);
        const reader = new FileReader();
        reader.onload = (ev) => previewSetter(ev.target.result);
        reader.readAsDataURL(file);
    };

    // ── ANTI-SPAM: Check daily image upload limit ──
    const checkImageLimit = async () => {
        if (!currentUser || isAdmin) return true; // Admin bypasses limit
        try {
            const today = new Date().toISOString().slice(0, 10);
            const { count, error: err } = await supabase
                .from('image_upload_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentUser.id)
                .gte('created_at', `${today}T00:00:00`);
            if (err) {
                console.log('image_upload_logs table not ready:', err.message);
                return true; // Allow if table doesn't exist yet
            }
            if (count >= MAX_IMAGES_PER_DAY) {
                setError(`Bạn đã hết lượt gửi ảnh hôm nay (${MAX_IMAGES_PER_DAY}/${MAX_IMAGES_PER_DAY}). Vui lòng thử lại ngày mai.`);
                return false;
            }
            return true;
        } catch { return true; }
    };

    const logImageUpload = async () => {
        if (!currentUser) return;
        try {
            await supabase.from('image_upload_logs').insert({ user_id: currentUser.id });
        } catch { /* silent */ }
    };

    const uploadImage = async (file) => {
        // Check daily limit before uploading
        const allowed = await checkImageLimit();
        if (!allowed) throw new Error(`Bạn đã hết lượt gửi ảnh hôm nay (${MAX_IMAGES_PER_DAY}/${MAX_IMAGES_PER_DAY}).`);

        // Upload to imgBB instead of Supabase Storage
        const publicUrl = await uploadToImgBB(file);

        // Log successful upload for anti-spam tracking
        await logImageUpload();

        return publicUrl;
    };

    const createTopic = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        setCreating(true);
        setError('');
        try {
            const user = currentUser;
            const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Ẩn danh';
            let imageUrl = null;
            if (newImage) {
                imageUrl = await uploadImage(newImage);
            }
            const { error: err } = await supabase.from('forum_topics').insert({
                user_id: user.id,
                display_name: displayName,
                title: newTitle.trim(),
                content: newContent.trim(),
                pet_type: newPetType,
                category: newCategory,
                image_url: imageUrl,
            });
            if (err) throw err;
            setNewTitle(''); setNewContent('');
            setNewImage(null); setNewImagePreview(null);
            setView('list');
            loadTopics();
        } catch (err) {
            setError(err.message);
        }
        setCreating(false);
    };

    // ── COMMENTS ──
    const loadComments = async (topicId) => {
        setLoadingComments(true);
        try {
            const { data, error: err } = await supabase
                .from('forum_comments')
                .select('*')
                .eq('topic_id', topicId)
                .order('created_at', { ascending: true });
            if (err) throw err;
            setComments(data || []);
        } catch (err) {
            setComments([]);
        }
        setLoadingComments(false);
    };

    const openTopic = (topic) => {
        setSelectedTopic(topic);
        setView('detail');
        loadComments(topic.id);
    };

    const postComment = async () => {
        if (!newComment.trim() && !commentImage) return;
        setCommenting(true);
        try {
            const user = currentUser;
            const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Ẩn danh';
            let imageUrl = null;
            if (commentImage) {
                imageUrl = await uploadImage(commentImage, 'forum-images');
            }
            const { error: err } = await supabase.from('forum_comments').insert({
                topic_id: selectedTopic.id,
                user_id: user.id,
                display_name: displayName,
                content: newComment.trim() || '📷',
                image_url: imageUrl,
            });
            if (err) throw err;
            setNewComment('');
            setCommentImage(null); setCommentImagePreview(null);
            loadComments(selectedTopic.id);
        } catch (err) {
            setError(err.message);
        }
        setCommenting(false);
    };

    const toggleLike = async (topicId) => {
        if (!currentUser) return;
        try {
            const { data: existing } = await supabase
                .from('topic_likes')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('topic_id', topicId)
                .maybeSingle();
            if (existing) {
                await supabase.from('topic_likes').delete().eq('user_id', currentUser.id).eq('topic_id', topicId);
                await supabase.from('forum_topics').update({ likes_count: Math.max(0, (selectedTopic?.likes_count || 1) - 1) }).eq('id', topicId);
            } else {
                await supabase.from('topic_likes').insert({ user_id: currentUser.id, topic_id: topicId });
                await supabase.from('forum_topics').update({ likes_count: (selectedTopic?.likes_count || 0) + 1 }).eq('id', topicId);
            }
            loadTopics();
            if (selectedTopic?.id === topicId) {
                const { data } = await supabase.from('forum_topics').select('*').eq('id', topicId).single();
                if (data) setSelectedTopic(data);
            }
        } catch (err) {
            console.log('Like error:', err);
        }
    };

    // ── FEEDBACK ──
    const loadFeedback = async () => {
        setLoadingFeedback(true);
        try {
            const { data, error: err } = await supabase
                .from('user_feedback')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            if (err) throw err;
            setFeedbackList(data || []);
        } catch { setFeedbackList([]); }
        setLoadingFeedback(false);
    };

    const submitFeedback = async () => {
        if (!fbContent.trim()) return;
        try {
            const user = currentUser;
            const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Ẩn danh';
            const { error: err } = await supabase.from('user_feedback').insert({
                user_id: user.id,
                display_name: displayName,
                type: fbType,
                content: fbContent.trim(),
            });
            if (err) throw err;
            setFbContent('');
            setFbSubmitted(true);
            setTimeout(() => setFbSubmitted(false), 3000);
            loadFeedback();
        } catch (err) {
            setError(err.message);
        }
    };

    // ── MESSAGING ──
    const loadConversations = async () => {
        if (!currentUser) return;
        setLoadingMessages(true);
        try {
            // Get latest message per conversation partner
            const { data, error: err } = await supabase
                .from('private_messages')
                .select('*')
                .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
                .order('created_at', { ascending: false })
                .limit(100);
            if (err) throw err;
            // Group by conversation partner
            const convMap = {};
            (data || []).forEach(msg => {
                const partnerId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
                const partnerName = msg.sender_id === currentUser.id ? 'User' : msg.sender_name;
                if (!convMap[partnerId]) {
                    convMap[partnerId] = {
                        partnerId, partnerName,
                        lastMessage: msg,
                        unread: 0,
                    };
                }
                if (msg.receiver_id === currentUser.id && !msg.is_read) {
                    convMap[partnerId].unread++;
                }
            });
            setConversations(Object.values(convMap));
        } catch { setConversations([]); }
        setLoadingMessages(false);
    };

    const openChat = async (partnerId, partnerName) => {
        setSelectedChat({ partnerId, partnerName });
        setView('chat');
        await loadChatMessages(partnerId);
        // Mark as read
        if (currentUser) {
            await supabase.from('private_messages')
                .update({ is_read: true })
                .eq('receiver_id', currentUser.id)
                .eq('sender_id', partnerId);
        }
    };

    const loadChatMessages = async (partnerId) => {
        if (!currentUser) return;
        try {
            const { data } = await supabase
                .from('private_messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true })
                .limit(100);
            setChatMessages(data || []);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch { setChatMessages([]); }
    };

    const sendMessage = async (contentOverride) => {
        const content = contentOverride || newMessage.trim();
        if (!content && !msgImage) return;
        try {
            const displayName = currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'Ẩn danh';
            let imageUrl = null;
            if (msgImage) {
                imageUrl = await uploadImage(msgImage, 'message-images');
            }
            await supabase.from('private_messages').insert({
                sender_id: currentUser.id,
                receiver_id: selectedChat.partnerId,
                sender_name: displayName,
                content: content || '📷',
                image_url: imageUrl,
                sticker: contentOverride && STICKERS.includes(contentOverride) ? contentOverride : null,
            });
            setNewMessage('');
            setMsgImage(null); setMsgImagePreview(null);
            setShowStickers(false);
            loadChatMessages(selectedChat.partnerId);
        } catch (err) {
            setError(err.message);
        }
    };

    // ── PROFILE POPUP ──
    const showProfile = (userId, displayName) => {
        if (userId === currentUser?.id) return;
        setProfilePopup({ userId, displayName });
    };

    // ── ADMIN: DELETE FUNCTIONS ──
    const deleteTopic = async (topicId) => {
        if (!isAdmin) return;
        if (!window.confirm('🗑️ Admin: Xóa topic này và tất cả bình luận?')) return;
        try {
            // Delete comments first
            await supabase.from('forum_comments').delete().eq('topic_id', topicId);
            await supabase.from('topic_likes').delete().eq('topic_id', topicId);
            // Delete topic
            const { error: err } = await supabase.from('forum_topics').delete().eq('id', topicId);
            if (err) throw err;
            setView('list');
            setSelectedTopic(null);
            loadTopics();
        } catch (err) {
            setError('Lỗi xóa topic: ' + err.message);
        }
    };

    const deleteComment = async (commentId) => {
        if (!isAdmin) return;
        if (!window.confirm('🗑️ Admin: Xóa bình luận này?')) return;
        try {
            const { error: err } = await supabase.from('forum_comments').delete().eq('id', commentId);
            if (err) throw err;
            if (selectedTopic) loadComments(selectedTopic.id);
        } catch (err) {
            setError('Lỗi xóa comment: ' + err.message);
        }
    };

    const deleteFeedback = async (feedbackId) => {
        if (!isAdmin) return;
        if (!window.confirm('🗑️ Admin: Xóa góp ý này?')) return;
        try {
            const { error: err } = await supabase.from('user_feedback').delete().eq('id', feedbackId);
            if (err) throw err;
            loadFeedback();
        } catch (err) {
            setError('Lỗi xóa feedback: ' + err.message);
        }
    };

    // ── UTILITIES ──
    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} ngày trước`;
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    const filteredTopics = topics.filter(t => {
        if (topicFilter !== 'all' && t.pet_type !== topicFilter) return false;
        if (catFilter !== 'all' && t.category !== catFilter) return false;
        return true;
    });

    // ── RENDER ──
    return (
        <div className="community-page">
            <h2>💬 Cộng Đồng & Góp Ý</h2>
            <p className="step-hint">Diễn đàn thú cưng · Chia sẻ · Hỏi đáp · Góp ý</p>

            {/* Profile Popup */}
            {profilePopup && (
                <div className="modal-overlay" onClick={() => setProfilePopup(null)}>
                    <div className="profile-popup text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center mb-3">
                            <img
                                src={profilesMap[profilePopup.userId]?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profilePopup.userId}`}
                                alt="Avatar"
                                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0' }}
                            />
                        </div>
                        <h3>{profilesMap[profilePopup.userId]?.display_name || profilePopup.displayName}</h3>
                        <p className="step-hint">Thành viên Pet Is My Family</p>
                        <button className="btn-primary" style={{ marginTop: '0.75rem', width: '100%' }}
                            onClick={() => {
                                openChat(profilePopup.userId, profilePopup.displayName);
                                setProfilePopup(null);
                                setTab('messages');
                            }}
                        >
                            💬 Nhắn tin
                        </button>
                        <button className="btn-back" style={{ marginTop: '0.5rem' }} onClick={() => setProfilePopup(null)}>
                            Đóng
                        </button>
                    </div>
                </div>
            )}

            {/* Main Tabs */}
            <div className="nutrition-tabs">
                <button className={`nutrition-tab ${tab === 'forum' ? 'active' : ''}`}
                    onClick={() => { setTab('forum'); setView('list'); }}>💬 Diễn Đàn</button>
                <button className={`nutrition-tab ${tab === 'feedback' ? 'active' : ''}`}
                    onClick={() => { setTab('feedback'); setView('list'); }}>📝 Góp Ý</button>
                <button className={`nutrition-tab ${tab === 'messages' ? 'active' : ''}`}
                    onClick={() => { setTab('messages'); setView('list'); }}>
                    ✉️ Tin Nhắn
                    {conversations.some(c => c.unread > 0) && <span className="unread-dot" />}
                </button>
            </div>

            {error && <p className="auth-error" style={{ margin: '0.5rem 0' }}>❌ {error}</p>}

            {/* ═══════ FORUM TAB ═══════ */}
            {tab === 'forum' && view === 'list' && (
                <ForumList
                    topics={filteredTopics}
                    loading={loadingTopics}
                    topicFilter={topicFilter}
                    setTopicFilter={setTopicFilter}
                    catFilter={catFilter}
                    setCatFilter={setCatFilter}
                    onCreateClick={() => setView('create')}
                    onTopicClick={openTopic}
                    onProfileClick={showProfile}
                    timeAgo={timeAgo}
                    onRefresh={loadTopics}
                    isAdmin={isAdmin}
                    onDeleteTopic={deleteTopic}
                    profilesMap={profilesMap}
                />
            )}

            {tab === 'forum' && view === 'create' && (
                <CreateTopic
                    title={newTitle} setTitle={setNewTitle}
                    content={newContent} setContent={setNewContent}
                    petType={newPetType} setPetType={setNewPetType}
                    category={newCategory} setCategory={setNewCategory}
                    imagePreview={newImagePreview}
                    onImageSelect={(e) => handleImageSelect(e, setNewImage, setNewImagePreview)}
                    onRemoveImage={() => { setNewImage(null); setNewImagePreview(null); }}
                    creating={creating}
                    onCreate={createTopic}
                    onBack={() => setView('list')}
                />
            )}

            {tab === 'forum' && view === 'detail' && selectedTopic && (
                <TopicDetail
                    topic={selectedTopic}
                    comments={comments}
                    loadingComments={loadingComments}
                    newComment={newComment} setNewComment={setNewComment}
                    commentImagePreview={commentImagePreview}
                    onCommentImageSelect={(e) => handleImageSelect(e, setCommentImage, setCommentImagePreview)}
                    onRemoveCommentImage={() => { setCommentImage(null); setCommentImagePreview(null); }}
                    commenting={commenting}
                    onPostComment={postComment}
                    onLike={() => toggleLike(selectedTopic.id)}
                    onBack={() => { setView('list'); setSelectedTopic(null); }}
                    onProfileClick={showProfile}
                    currentUser={currentUser}
                    timeAgo={timeAgo}
                    isAdmin={isAdmin}
                    onDeleteTopic={deleteTopic}
                    onDeleteComment={deleteComment}
                    profilesMap={profilesMap}
                />
            )}

            {/* ═══════ FEEDBACK TAB ═══════ */}
            {tab === 'feedback' && (
                <FeedbackSection
                    fbType={fbType} setFbType={setFbType}
                    fbContent={fbContent} setFbContent={setFbContent}
                    fbSubmitted={fbSubmitted}
                    onSubmit={submitFeedback}
                    feedbackList={feedbackList}
                    loading={loadingFeedback}
                    timeAgo={timeAgo}
                    isAdmin={isAdmin}
                    onDeleteFeedback={deleteFeedback}
                />
            )}

            {/* ═══════ MESSAGES TAB ═══════ */}
            {tab === 'messages' && view !== 'chat' && (
                <ConversationList
                    conversations={conversations}
                    loading={loadingMessages}
                    onOpenChat={openChat}
                    timeAgo={timeAgo}
                />
            )}

            {tab === 'messages' && view === 'chat' && selectedChat && (
                <ChatView
                    chat={selectedChat}
                    messages={chatMessages}
                    currentUser={currentUser}
                    newMessage={newMessage} setNewMessage={setNewMessage}
                    msgImagePreview={msgImagePreview}
                    onMsgImageSelect={(e) => handleImageSelect(e, setMsgImage, setMsgImagePreview)}
                    onRemoveMsgImage={() => { setMsgImage(null); setMsgImagePreview(null); }}
                    showStickers={showStickers} setShowStickers={setShowStickers}
                    onSend={sendMessage}
                    onBack={() => { setView('list'); setSelectedChat(null); loadConversations(); }}
                    chatEndRef={chatEndRef}
                    timeAgo={timeAgo}
                />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

function ForumList({ topics, loading, topicFilter, setTopicFilter, catFilter, setCatFilter, onCreateClick, onTopicClick, onProfileClick, timeAgo, onRefresh, isAdmin, onDeleteTopic, profilesMap }) {
    return (
        <>
            {/* Filters */}
            <div className="forum-filters">
                <div className="filter-row">
                    {[{ id: 'all', label: '🔥 Tất cả' }, ...PET_TYPES].map(p => (
                        <button key={p.id} className={`chip ${topicFilter === p.id ? 'active' : ''}`}
                            onClick={() => setTopicFilter(p.id)}>{p.label}</button>
                    ))}
                </div>
                <div className="filter-row">
                    {[{ id: 'all', label: '📋 Tất cả' }, ...CATEGORIES].map(c => (
                        <button key={c.id} className={`chip ${catFilter === c.id ? 'active' : ''}`}
                            onClick={() => setCatFilter(c.id)}>{c.label}</button>
                    ))}
                </div>
            </div>

            {/* Admin badge */}
            {isAdmin && <div className="admin-badge">🛡️ Chế độ Admin — Bạn có thể xóa bài viết</div>}

            {/* Create button */}
            <button className="btn-primary btn-create-topic" onClick={onCreateClick}>
                ✏️ Tạo Topic Mới
            </button>

            {/* Topics list */}
            <div className="topics-list">
                {loading && <div className="loading-spinner">⏳ Đang tải...</div>}

                {!loading && topics.length === 0 && (
                    <div className="empty-posts">
                        <span className="empty-icon">📝</span>
                        <p>Chưa có topic nào. Hãy là người đầu tiên!</p>
                    </div>
                )}

                {topics.map(topic => {
                    const pet = PET_TYPES.find(p => p.id === topic.pet_type);
                    const cat = CATEGORIES.find(c => c.id === topic.category);
                    return (
                        <div key={topic.id} className="topic-card" onClick={() => onTopicClick(topic)}>
                            {topic.pinned && <span className="pin-badge">📌 Ghim</span>}
                            <div className="topic-meta">
                                <span className="chip-mini" style={{ borderColor: pet?.color }}>{pet?.label}</span>
                                <span className="chip-mini" style={{ borderColor: cat?.color }}>{cat?.label}</span>
                                {isAdmin && (
                                    <button className="btn-admin-delete" onClick={(e) => { e.stopPropagation(); onDeleteTopic(topic.id); }}
                                        title="Admin: Xóa topic">🗑️</button>
                                )}
                            </div>
                            <h3 className="topic-title">{topic.title}</h3>
                            <p className="topic-preview">{topic.content.substring(0, 120)}{topic.content.length > 120 ? '...' : ''}</p>
                            {topic.image_url && <div className="topic-has-image">📷 Có ảnh đính kèm</div>}
                            <div className="topic-footer">
                                <span className="topic-author flex items-center gap-2" onClick={(e) => { e.stopPropagation(); onProfileClick(topic.user_id, topic.display_name); }}>
                                    <img src={profilesMap[topic.user_id]?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${topic.user_id}`} alt="avatar" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                    {profilesMap[topic.user_id]?.display_name || topic.display_name}
                                </span>
                                <span className="topic-stats">
                                    ❤️ {topic.likes_count || 0} · 💬 {topic.comments_count || 0}
                                </span>
                                <span className="topic-time">{timeAgo(topic.created_at)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function CreateTopic({ title, setTitle, content, setContent, petType, setPetType, category, setCategory, imagePreview, onImageSelect, onRemoveImage, creating, onCreate, onBack }) {
    const fileRef = useRef(null);
    return (
        <div className="create-topic-form">
            <h3>✏️ Tạo Topic Mới</h3>

            <label className="form-label">🐾 Loại thú cưng</label>
            <div className="filter-row">
                {PET_TYPES.map(p => (
                    <button key={p.id} className={`chip ${petType === p.id ? 'active' : ''}`}
                        style={petType === p.id ? { background: p.color, borderColor: p.color } : {}}
                        onClick={() => setPetType(p.id)}>{p.label}</button>
                ))}
            </div>

            <label className="form-label">📂 Danh mục</label>
            <div className="filter-row">
                {CATEGORIES.map(c => (
                    <button key={c.id} className={`chip ${category === c.id ? 'active' : ''}`}
                        style={category === c.id ? { background: c.color, borderColor: c.color } : {}}
                        onClick={() => setCategory(c.id)}>{c.label}</button>
                ))}
            </div>

            <label className="form-label">📝 Tiêu đề</label>
            <input type="text" className="search-input" placeholder="Tiêu đề topic..." value={title}
                onChange={e => setTitle(e.target.value)} maxLength={200} />

            <label className="form-label">💬 Nội dung</label>
            <textarea className="post-input" placeholder="Viết nội dung chi tiết..." value={content}
                onChange={e => setContent(e.target.value)} rows={6} maxLength={5000} />

            <div className="image-upload-row">
                <button className="btn-upload" onClick={() => fileRef.current?.click()}>📷 Thêm ảnh</button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImageSelect} />
            </div>
            {imagePreview && (
                <div className="image-preview-box">
                    <img src={imagePreview} alt="preview" />
                    <button className="btn-remove-image" onClick={onRemoveImage}>✕</button>
                </div>
            )}

            <div className="post-form-footer">
                <span className="char-count">{content.length}/5000</span>
                <div className="btn-row">
                    <button className="btn-back" onClick={onBack}>← Quay lại</button>
                    <button className="btn-primary" onClick={onCreate} disabled={creating || !title.trim() || !content.trim()}>
                        {creating ? '⏳ Đang đăng...' : '📤 Đăng Topic'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TopicDetail({ topic, comments, loadingComments, newComment, setNewComment, commentImagePreview, onCommentImageSelect, onRemoveCommentImage, commenting, onPostComment, onLike, onBack, onProfileClick, currentUser, timeAgo, isAdmin, onDeleteTopic, onDeleteComment, profilesMap }) {
    const pet = PET_TYPES.find(p => p.id === topic.pet_type);
    const cat = CATEGORIES.find(c => c.id === topic.category);
    const fileRef = useRef(null);

    return (
        <div className="topic-detail">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn-back" onClick={onBack}>← Quay lại diễn đàn</button>
                {isAdmin && (
                    <button className="btn-admin-delete-big" onClick={() => onDeleteTopic(topic.id)}>
                        🗑️ Xóa Topic
                    </button>
                )}
            </div>

            <div className="topic-detail-card">
                <div className="topic-meta">
                    <span className="chip-mini" style={{ borderColor: pet?.color }}>{pet?.label}</span>
                    <span className="chip-mini" style={{ borderColor: cat?.color }}>{cat?.label}</span>
                </div>
                <h2 className="topic-detail-title">{topic.title}</h2>
                <div className="topic-detail-author flex items-center gap-2" onClick={() => onProfileClick(topic.user_id, topic.display_name)}>
                    <img src={profilesMap[topic.user_id]?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${topic.user_id}`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    <strong>{profilesMap[topic.user_id]?.display_name || topic.display_name}</strong> · {timeAgo(topic.created_at)}
                </div>
                <div className="topic-detail-content">{topic.content}</div>
                {topic.image_url && (
                    <div className="topic-image-full">
                        <LazyImage src={topic.image_url} alt="topic" style={{ width: '100%', borderRadius: '8px', maxHeight: '500px', objectFit: 'contain' }} />
                    </div>
                )}
                <div className="topic-actions">
                    <button className="btn-like" onClick={onLike}>❤️ {topic.likes_count || 0}</button>
                    <span className="comment-count">💬 {comments.length} bình luận</span>
                </div>
            </div>

            {/* Comments */}
            <div className="comments-section">
                <h3>💬 Bình luận ({comments.length})</h3>
                {loadingComments && <div className="loading-spinner">⏳ Đang tải...</div>}

                {comments.map(c => (
                    <div key={c.id} className="comment-card">
                        <div className="comment-header">
                            <span className="comment-author flex items-center gap-2" onClick={() => onProfileClick(c.user_id, c.display_name)}>
                                <img src={profilesMap[c.user_id]?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.user_id}`} alt="avatar" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                {profilesMap[c.user_id]?.display_name || c.display_name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="comment-time">{timeAgo(c.created_at)}</span>
                                {isAdmin && (
                                    <button className="btn-admin-delete" onClick={() => onDeleteComment(c.id)}
                                        title="Admin: Xóa bình luận">🗑️</button>
                                )}
                            </div>
                        </div>
                        <p className="comment-content">{c.content}</p>
                        {c.image_url && (
                            <div className="comment-image">
                                <LazyImage src={c.image_url} alt="comment" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                ))}

                {/* Add comment */}
                <div className="add-comment">
                    <textarea className="post-input" placeholder="Viết bình luận..." value={newComment}
                        onChange={e => setNewComment(e.target.value)} rows={2} maxLength={2000} />
                    <div className="image-upload-row">
                        <button className="btn-upload" onClick={() => fileRef.current?.click()}>📷</button>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onCommentImageSelect} />
                        <button className="btn-primary" onClick={onPostComment} disabled={commenting || (!newComment.trim() && !commentImagePreview)}>
                            {commenting ? '⏳' : '📤 Gửi'}
                        </button>
                    </div>
                    {commentImagePreview && (
                        <div className="image-preview-box small">
                            <img src={commentImagePreview} alt="preview" />
                            <button className="btn-remove-image" onClick={onRemoveCommentImage}>✕</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FeedbackSection({ fbType, setFbType, fbContent, setFbContent, fbSubmitted, onSubmit, feedbackList, loading, timeAgo, isAdmin, onDeleteFeedback }) {
    return (
        <div className="feedback-section">
            <div className="post-form">
                <h3 style={{ marginBottom: '0.75rem' }}>📝 Gửi Góp Ý / Báo Lỗi</h3>
                <div className="filter-row" style={{ marginBottom: '0.75rem' }}>
                    {FB_TYPES.map(t => (
                        <button key={t.id} className={`chip ${fbType === t.id ? 'active' : ''}`}
                            style={fbType === t.id ? { background: t.color, borderColor: t.color } : {}}
                            onClick={() => setFbType(t.id)}>{t.label}</button>
                    ))}
                </div>
                <textarea className="post-input"
                    placeholder={fbType === 'suggestion' ? '💡 Bạn muốn cải thiện gì?' : fbType === 'bug' ? '🐛 Mô tả lỗi...' : '📝 Nội dung...'}
                    value={fbContent} onChange={e => setFbContent(e.target.value)} rows={4} maxLength={1000} />
                <div className="post-form-footer">
                    <span className="char-count">{fbContent.length}/1000</span>
                    <button className="btn-primary" onClick={onSubmit} disabled={!fbContent.trim()}>📤 Gửi Góp Ý</button>
                </div>
                {fbSubmitted && (
                    <div className="success-toast">✅ Đã gửi thành công! Cảm ơn bạn.</div>
                )}
            </div>
            {feedbackList.length > 0 && (
                <div className="zone-list">
                    <h3>📋 Góp ý gần đây ({feedbackList.length})</h3>
                    {feedbackList.map(fb => {
                        const typeInfo = FB_TYPES.find(t => t.id === fb.type) || FB_TYPES[2];
                        return (
                            <div key={fb.id} className="post-card" style={{ borderLeft: `4px solid ${typeInfo.color}` }}>
                                <div className="post-header">
                                    <span className="post-avatar">{typeInfo.label.split(' ')[0]}</span>
                                    <span className="post-author">{fb.display_name}</span>
                                    <span className="post-time">{timeAgo(fb.created_at)}</span>
                                    {isAdmin && (
                                        <button className="btn-admin-delete" onClick={() => onDeleteFeedback(fb.id)}
                                            title="Admin: Xóa góp ý">🗑️</button>
                                    )}
                                </div>
                                <p className="post-content">{fb.content}</p>
                                <span className={`fb-status fb-status-${fb.status}`}>{
                                    fb.status === 'pending' ? '⏳ Đang chờ' :
                                        fb.status === 'read' ? '👁️ Đã xem' : '✅ Đã xử lý'
                                }</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ConversationList({ conversations, loading, onOpenChat, timeAgo }) {
    return (
        <div className="conversations-list">
            {loading && <div className="loading-spinner">⏳ Đang tải...</div>}
            {!loading && conversations.length === 0 && (
                <div className="empty-posts">
                    <span className="empty-icon">✉️</span>
                    <p>Chưa có tin nhắn nào.</p>
                    <p className="step-hint">Nhấn vào tên người dùng trong diễn đàn để nhắn tin.</p>
                </div>
            )}
            {conversations.map(c => (
                <div key={c.partnerId} className="conversation-card" onClick={() => onOpenChat(c.partnerId, c.partnerName)}>
                    <div className="conv-avatar">👤</div>
                    <div className="conv-info">
                        <strong>{c.partnerName}</strong>
                        <p className="conv-last-msg">
                            {c.lastMessage?.sticker || c.lastMessage?.content?.substring(0, 60) || '📷 Ảnh'}
                        </p>
                    </div>
                    <div className="conv-meta">
                        <span className="conv-time">{timeAgo(c.lastMessage?.created_at)}</span>
                        {c.unread > 0 && <span className="unread-badge">{c.unread}</span>}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ChatView({ chat, messages, currentUser, newMessage, setNewMessage, msgImagePreview, onMsgImageSelect, onRemoveMsgImage, showStickers, setShowStickers, onSend, onBack, chatEndRef, timeAgo }) {
    const fileRef = useRef(null);
    return (
        <div className="chat-view">
            <div className="chat-header">
                <button className="btn-back" onClick={onBack}>←</button>
                <h3>💬 {chat.partnerName}</h3>
            </div>

            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="empty-posts" style={{ padding: '2rem' }}>
                        <p>Bắt đầu cuộc trò chuyện! 🐾</p>
                    </div>
                )}
                {messages.map(msg => {
                    const isMine = msg.sender_id === currentUser?.id;
                    return (
                        <div key={msg.id} className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                            {msg.sticker ? (
                                <span className="chat-sticker">{msg.sticker}</span>
                            ) : (
                                <p>{msg.content}</p>
                            )}
                            {msg.image_url && (
                                <LazyImage src={msg.image_url} alt="msg" className="chat-image" style={{ maxWidth: '200px', borderRadius: '8px', maxHeight: '200px', objectFit: 'cover' }} />
                            )}
                            <span className="chat-time">{timeAgo(msg.created_at)}</span>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            {/* Sticker picker */}
            {showStickers && (
                <div className="sticker-picker">
                    {STICKERS.map(s => (
                        <button key={s} className="sticker-btn" onClick={() => onSend(s)}>{s}</button>
                    ))}
                </div>
            )}

            {/* Image preview */}
            {msgImagePreview && (
                <div className="image-preview-box small" style={{ margin: '0.5rem' }}>
                    <img src={msgImagePreview} alt="preview" />
                    <button className="btn-remove-image" onClick={onRemoveMsgImage}>✕</button>
                </div>
            )}

            {/* Input bar */}
            <div className="chat-input-bar">
                <button className="btn-upload" onClick={() => setShowStickers(!showStickers)}>😀</button>
                <button className="btn-upload" onClick={() => fileRef.current?.click()}>📷</button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onMsgImageSelect} />
                <input type="text" className="chat-input" placeholder="Nhập tin nhắn..."
                    value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                />
                <button className="btn-primary btn-send" onClick={() => onSend()} disabled={!newMessage.trim() && !msgImagePreview}>
                    📤
                </button>
            </div>
        </div>
    );
}
