const quizData = [
    {
        question: "What is the capital of England?",
        options: ["London", "Paris", "Berlin", "Madrid"],
        answer: "London"
    },
    {
        question: "Which of the following is a synonym for 'happy'?",
        options: ["Sad", "Joyful", "Angry", "Bored"],
        answer: "Joyful"
    },
    {
        question: "What is the past tense of 'go'?",
        options: ["Gone", "Went", "Going", "Goes"],
        answer: "Went"
    }
];

let currentQuestionIndex = 0;
let score = 0;

function loadQuiz() {
    const questionContainer = document.getElementById('question');
    const optionsContainer = document.getElementById('options');

    if (currentQuestionIndex < quizData.length) {
        const currentQuestion = quizData[currentQuestionIndex];
        questionContainer.innerText = currentQuestion.question;
        optionsContainer.innerHTML = '';

        currentQuestion.options.forEach(option => {
            const button = document.createElement('button');
            button.innerText = option;
            button.onclick = () => checkAnswer(option);
            optionsContainer.appendChild(button);
        });
    } else {
        displayResults();
    }
}

function checkAnswer(selectedOption) {
    const correctAnswer = quizData[currentQuestionIndex].answer;
    if (selectedOption === correctAnswer) {
        score++;
    }
    currentQuestionIndex++;
    loadQuiz();
}

function displayResults() {
    const questionContainer = document.getElementById('question');
    const optionsContainer = document.getElementById('options');
    questionContainer.innerText = `You scored ${score} out of ${quizData.length}`;
    optionsContainer.innerHTML = '';
}

export { loadQuiz, checkAnswer, displayResults };