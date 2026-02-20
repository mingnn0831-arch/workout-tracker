// State Management
let workouts = JSON.parse(localStorage.getItem('workouts')) || [
    { id: Date.now(), name: '팔굽혀펴기', sets: 5, currentSet: 0 }
];

let setsToAdd = 5;

// DOM Elements
const workoutList = document.getElementById('workout-list');
const workoutNameInput = document.getElementById('workout-name-input');
const setsValueDisplay = document.getElementById('sets-value');
const minusBtn = document.getElementById('minus-btn');
const plusBtn = document.getElementById('plus-btn');
const addWorkoutBtn = document.getElementById('add-workout-btn');

// Initialize
function init() {
    render();
    setupAddForm();
    lucide.createIcons();
}

// Render Functions
function render() {
    workoutList.innerHTML = '';
    
    workouts.forEach(workout => {
        const card = document.createElement('div');
        card.className = `workout-card ${workout.currentSet === workout.sets ? 'completed' : ''}`;
        
        const isFinished = workout.currentSet === workout.sets;
        
        card.innerHTML = `
            <div class="workout-header">
                <div class="workout-name">${workout.name}</div>
                <button class="delete-btn" onclick="deleteWorkout(${workout.id})" aria-label="Delete">
                    <i data-lucide="trash-2" size="18"></i>
                </button>
            </div>
            <div class="progress-dots">
                ${Array.from({ length: workout.sets }).map((_, i) => `
                    <div class="dot ${i < workout.currentSet ? 'filled' : ''}"></div>
                `).join('')}
            </div>
            <div class="workout-controls">
                <button class="complete-btn" onclick="completeSet(${workout.id})" ${isFinished ? 'disabled' : ''}>
                    ${isFinished ? '수고하셨습니다!' : '완료'}
                </button>
                <button class="reset-btn" onclick="resetWorkout(${workout.id})">리셋</button>
            </div>
            ${isFinished ? '<div class="celebration">세트 완료!</div>' : ''}
        `;
        
        workoutList.appendChild(card);
    });
    
    lucide.createIcons();
    save();
}

// Logic Functions
window.completeSet = (id) => {
    const workout = workouts.find(w => w.id === id);
    if (workout && workout.currentSet < workout.sets) {
        workout.currentSet++;
        render();
    }
};

window.resetWorkout = (id) => {
    const workout = workouts.find(w => w.id === id);
    if (workout) {
        workout.currentSet = 0;
        render();
    }
};

window.deleteWorkout = (id) => {
    workouts = workouts.filter(w => w.id !== id);
    render();
};

function setupAddForm() {
    minusBtn.onclick = () => {
        if (setsToAdd > 1) {
            setsToAdd--;
            setsValueDisplay.textContent = setsToAdd;
        }
    };
    
    plusBtn.onclick = () => {
        if (setsToAdd < 20) {
            setsToAdd++;
            setsValueDisplay.textContent = setsToAdd;
        }
    };
    
    addWorkoutBtn.onclick = () => {
        const name = workoutNameInput.value.trim();
        if (name) {
            workouts.push({
                id: Date.now(),
                name: name,
                sets: setsToAdd,
                currentSet: 0
            });
            workoutNameInput.value = '';
            render();
            // Scroll to bottom
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else {
            workoutNameInput.focus();
        }
    };
}

function save() {
    localStorage.setItem('workouts', JSON.stringify(workouts));
}

// Run
init();
