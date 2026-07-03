// Modal functionality for creating new questions

document.addEventListener('DOMContentLoaded', () => {
    setupModalClosing();
});

function openNewQuestionModal() {
    const modal = document.getElementById('questionModal');
    modal.style.display = 'flex';
}

function closeNewQuestionModal() {
    const modal = document.getElementById('questionModal');
    modal.style.display = 'none';
    // Clear the form
    document.getElementById('newQuestionForm').reset();
}

function setupModalClosing() {
    // Close modal when clicking outside of it
    const modal = document.getElementById('questionModal');
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeNewQuestionModal();
        }
    });
}

async function submitNewQuestion(event) {
    event.preventDefault();

    const title = document.getElementById('question-title').value.trim();
    const description = document.getElementById('question-description').value.trim();
    const author = document.getElementById('question-author').value.trim();

    if (!title || !description || !author) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch('/api/question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getCsrfHeader()
            },
            body: JSON.stringify({
                title,
                description,
                author,
                like_count: 0
            })
        });

        const data = await response.json();

        if (data.status === 201) {
            closeNewQuestionModal();
            loadQuestions(); // Reload the questions list
            alert('Question posted successfully!');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error posting question:', error);
        alert('Failed to post question. Please try again.');
    }
}
