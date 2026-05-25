export function saveProgress(userId, progressData) {
    localStorage.setItem(`progress_${userId}`, JSON.stringify(progressData));
}

export function getProgress(userId) {
    const progressData = localStorage.getItem(`progress_${userId}`);
    return progressData ? JSON.parse(progressData) : null;
}

export function resetProgress(userId) {
    localStorage.removeItem(`progress_${userId}`);
}