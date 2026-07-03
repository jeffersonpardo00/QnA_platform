// Get question ID from URL parameters
function getQuestionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Load question details when page loads
document.addEventListener('DOMContentLoaded', () => {
    const questionId = getQuestionIdFromUrl();
    if (questionId) {
        loadQuestionDetail(questionId);
    } else {
        document.getElementById('question-detail-container').innerHTML = 
            '<div class="error">No question ID provided</div>';
    }
});

async function loadQuestionDetail(questionId) {
    const container = document.getElementById('question-detail-container');

    try {
        const response = await fetch(`/api/question/${questionId}`);
        const data = await response.json();

        if (data.status === 200) {
            container.innerHTML = '';
            displayQuestionDetail(data.question);
            displayNewCommentForm(questionId);
            displayComments(data.question.comments);
        } else {
            container.innerHTML = `<div class="error">Error: ${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error fetching question:', error);
        container.innerHTML = '<div class="error">Failed to load question. Please try again.</div>';
    }
}

function displayQuestionDetail(question) {
    const container = document.getElementById('question-detail-container');
    const createdDate = new Date(question.creation_date);
    const formattedDate = formatDate(createdDate);

    const detailDiv = document.createElement('div');
    detailDiv.className = 'question-detail';

    detailDiv.innerHTML = `
        <div class="detail-header">
            <h1 class="detail-title">${escapeHtml(question.title)}</h1>
            <div class="detail-meta">
                <span>by <span class="question-author">${escapeHtml(question.author)}</span></span>
                <span>•</span>
                <span>${formattedDate}</span>
            </div>
        </div>

        <div class="detail-description">
            ${escapeHtml(question.description)}
        </div>

        <div class="detail-actions">
            <button class="like-button" id="question-like-btn" onclick="likeQuestion(${question.id}, this)">
                <span>👍</span>
                <span class="like-count">${question.like_count}</span>
            </button>
        </div>

        <hr class="section-divider">
    `;

    container.appendChild(detailDiv);
}

function displayNewCommentForm(questionId) {
    const container = document.getElementById('new-comment-form-container');

    const formDiv = document.createElement('div');
    formDiv.className = 'comment-form';

    formDiv.innerHTML = `
        <h3>Add a Comment</h3>
        <form onsubmit="submitComment(event, ${questionId})">
            <input 
                type="text" 
                id="comment-author" 
                placeholder="Your name" 
                required
                class="form-input"
            />
            <textarea 
                id="comment-text" 
                placeholder="Write your comment here..." 
                required
                class="form-textarea"
            ></textarea>
            <button type="submit" class="btn-submit">Post Comment</button>
        </form>
    `;

    container.appendChild(formDiv);
}

async function submitComment(event, questionId, replyToId = null) {
    event.preventDefault();

    const authorInput = document.getElementById('comment-author');
    const textInput = document.getElementById('comment-text');

    const author = authorInput.value.trim();
    const text = textInput.value.trim();

    if (!author || !text) {
        alert('Please fill in all fields');
        return;
    }

    try {
        let url, body;

        if (replyToId) {
            // Replying to a comment
            url = `/comments/${replyToId}/reply`;
            body = {
                text,
                author,
                question_id: questionId
            };
        } else {
            // New top-level comment on question
            url = `/questions/${questionId}/comment`;
            body = {
                text,
                author
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.status === 201) {
            // Clear form
            if (!replyToId) {
                textInput.value = '';
                // Reload comments
                loadQuestionDetail(questionId);
            } else {
                // For replies, find the reply form and close it
                const replyForm = document.getElementById(`reply-form-${replyToId}`);
                if (replyForm) {
                    replyForm.remove();
                }
                // Reload comments
                loadQuestionDetail(questionId);
            }
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error posting comment:', error);
        alert('Failed to post comment. Please try again.');
    }
}

function displayComments(comments) {
    const container = document.getElementById('comments-container');
    container.innerHTML = '';

    if (comments.length === 0) {
        container.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
        return;
    }

    const commentsDiv = document.createElement('div');
    commentsDiv.className = 'comments-list';

    comments.forEach(comment => {
        const commentElement = createCommentElement(comment);
        commentsDiv.appendChild(commentElement);
    });

    container.appendChild(commentsDiv);
}

function createCommentElement(comment, isReply = false) {
    const commentDiv = document.createElement('div');
    commentDiv.className = isReply ? 'comment reply-comment' : 'comment';

    const createdDate = new Date(comment.creation_date);
    const formattedDate = formatDate(createdDate);

    let repliesHtml = '';
    if (comment.replies && comment.replies.length > 0) {
        repliesHtml = '<div class="replies-container">';
        comment.replies.forEach(reply => {
            const replyElement = createCommentElement(reply, true);
            repliesHtml += replyElement.outerHTML;
        });
        repliesHtml += '</div>';
    }

    commentDiv.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${escapeHtml(comment.author)}</span>
            <span class="comment-date">${formattedDate}</span>
        </div>

        <div class="comment-text">
            ${escapeHtml(comment.text)}
        </div>

        <div class="comment-actions">
            <button class="like-btn" onclick="likeComment(${comment.id}, this)">
                <span>👍</span>
                <span class="like-count">${comment.like_count}</span>
            </button>
            <button class="reply-btn" onclick="toggleReplyForm(${comment.id})">
                💬 Reply
            </button>
        </div>

        <div id="reply-form-container-${comment.id}" class="reply-form-container"></div>

        ${repliesHtml}
    `;

    return commentDiv;
}

function toggleReplyForm(commentId) {
    const container = document.getElementById(`reply-form-container-${commentId}`);
    
    if (container.innerHTML.trim() !== '') {
        container.innerHTML = '';
        return;
    }

    const form = document.createElement('form');
    form.id = `reply-form-${commentId}`;
    form.className = 'reply-form';
    form.onsubmit = (e) => {
        e.preventDefault();
        const questionId = getQuestionIdFromUrl();
        submitComment(e, questionId, commentId);
    };

    form.innerHTML = `
        <input 
            type="text" 
            placeholder="Your name" 
            required
            class="form-input reply-input"
        />
        <textarea 
            placeholder="Write your reply here..." 
            required
            class="form-textarea reply-textarea"
        ></textarea>
        <div class="reply-form-buttons">
            <button type="submit" class="btn-submit">Post Reply</button>
            <button type="button" class="btn-cancel" onclick="toggleReplyForm(${commentId})">Cancel</button>
        </div>
    `;

    container.appendChild(form);
}

async function likeQuestion(questionId, buttonElement) {
    try {
        const response = await fetch(`/questions/${questionId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.status === 200) {
            const likeCount = buttonElement.querySelector('.like-count');
            const currentCount = parseInt(likeCount.textContent);
            likeCount.textContent = currentCount + 1;

            buttonElement.classList.add('liked');
            setTimeout(() => {
                buttonElement.classList.remove('liked');
            }, 300);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error liking question:', error);
        alert('Failed to like question. Please try again.');
    }
}

async function likeComment(commentId, buttonElement) {
    try {
        const response = await fetch(`/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.status === 200) {
            const likeCount = buttonElement.querySelector('.like-count');
            const currentCount = parseInt(likeCount.textContent);
            likeCount.textContent = currentCount + 1;

            buttonElement.classList.add('liked');
            setTimeout(() => {
                buttonElement.classList.remove('liked');
            }, 300);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error liking comment:', error);
        alert('Failed to like comment. Please try again.');
    }
}

function goBack() {
    window.location.href = '/';
}

function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'just now';
    } else if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
