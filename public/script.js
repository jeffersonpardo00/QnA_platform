// Fetch and display questions when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
});


async function loadQuestions() {
    const container = document.getElementById('questions-container');

    try {
        const response = await fetch('/api/qlist');
        const data = await response.json();

        if (data.status === 200 && data.questions.length > 0) {
            container.innerHTML = '';
            displayQuestions(data.questions);
        } else if (data.questions.length === 0) {
            container.innerHTML = '<div class="no-questions">No questions found</div>';
        } else {
            container.innerHTML = `<div class="error">Error loading questions: ${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error fetching questions:', error);
        container.innerHTML = `<div class="error">Failed to load questions. Please try again later.</div>`;
    }
}

function displayQuestions(questions) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    questions.forEach(question => {
        const questionCard = createQuestionCard(question);
        container.appendChild(questionCard);
    });
}

function createQuestionCard(question) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.style.cursor = 'pointer';
    card.onclick = () => {
        window.location.href = `/detail.html?id=${question.id}`;
    };

    const createdDate = new Date(question.creation_date);
    const formattedDate = formatDate(createdDate);

    const likeCount = question.like_count || 0;

    card.innerHTML = `
        <div class="question-header">
            <h2 class="question-title">${escapeHtml(question.title)}</h2>
        </div>
        
        <div class="question-description">
            ${escapeHtml(question.description)}
        </div>

        <div class="question-meta">
            <span>by <span class="question-author">${escapeHtml(question.author)}</span></span>
            <span>•</span>
            <span>${formattedDate}</span>
        </div>

        <div class="question-footer">
            <div class="question-stats">
                <div class="stat">
                    <span>💬 ${question.comment_count} ${question.comment_count === 1 ? 'comment' : 'comments'}</span>
                </div>
            </div>
            <button class="like-button" onclick="likeQuestion(${question.id}, this)">
                <span>👍</span>
                <span class="like-count">${likeCount}</span>
            </button>
        </div>
    `;

    return card;
}

async function likeQuestion(questionId, buttonElement) {
    try {
        const response = await fetch(`/questions/${questionId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getCsrfHeader()
            }
        });

        const data = await response.json();

        if (data.status === 200) {
            // Update the like count in the UI
            const likeCount = buttonElement.querySelector('.like-count');
            const currentCount = parseInt(likeCount.textContent);
            likeCount.textContent = currentCount + 1;

            // Add visual feedback
            buttonElement.classList.add('liked');
            setTimeout(() => {
                buttonElement.classList.remove('liked');
            }, 300);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error liking question:', error);
        alert('Failed to like the question. Please try again.');
    }
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
