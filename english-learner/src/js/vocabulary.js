const vocabularyList = [
    { word: "apple", definition: "A fruit that is typically red, green, or yellow." },
    { word: "book", definition: "A set of written or printed pages, usually bound with a protective cover." },
    { word: "computer", definition: "An electronic device for storing and processing data." },
    { word: "dictionary", definition: "A reference book containing words and their meanings." },
    { word: "elephant", definition: "A large mammal with a trunk, native to Africa and Asia." }
];

function loadVocabulary() {
    return vocabularyList;
}

function displayVocabulary() {
    const vocabularyContainer = document.getElementById('vocabulary-container');
    vocabularyContainer.innerHTML = '';

    vocabularyList.forEach(item => {
        const wordElement = document.createElement('div');
        wordElement.className = 'vocabulary-item';
        wordElement.innerHTML = `<strong>${item.word}</strong>: ${item.definition}`;
        vocabularyContainer.appendChild(wordElement);
    });
}

export { loadVocabulary, displayVocabulary };