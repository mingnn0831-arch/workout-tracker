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
const addPanel = document.getElementById('add-panel');
const toggleAddBtn = document.getElementById('toggle-add-btn');
const closePanelBtn = document.getElementById('close-panel-btn');
const globalOverlay = document.getElementById('global-completion-overlay');
const resetAllBtn = document.getElementById('reset-all-btn');
const closeOverlayBtn = document.getElementById('close-overlay-btn');

// Initialize
function init() {
    // Remove the inline display:none and use the CSS class for transitions
    addPanel.style.display = 'block';
    globalOverlay.style.display = 'flex'; // Use flex for centering overlay
    render();
    setupEvents();
    lucide.createIcons();
}

// Render Functions
function render() {
    workoutList.innerHTML = '';

    workouts.forEach(workout => {
        const card = document.createElement('div');
        card.className = `workout-card ${workout.currentSet === workout.sets ? 'completed' : ''}`;

        // Add click listener to the whole card
        card.onclick = () => completeSet(workout.id);

        card.innerHTML = `
            <div class="workout-header">
                <div class="workout-name">${workout.name}</div>
                <div class="header-actions">
                    <button class="action-icon-btn reset-icon" onclick="resetWorkout(${workout.id}, event)" aria-label="Reset">
                        <i data-lucide="rotate-ccw" size="18"></i>
                    </button>
                    <button class="action-icon-btn delete-icon" onclick="deleteWorkout(${workout.id}, event)" aria-label="Delete">
                        <i data-lucide="trash-2" size="18"></i>
                    </button>
                </div>
            </div>
            <div class="progress-dots">
                ${Array.from({ length: workout.sets }).map((_, i) => `
                    <div class="dot ${i < workout.currentSet ? 'filled' : ''}"></div>
                `).join('')}
            </div>
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
        checkGlobalCompletion();
    }
};

function checkGlobalCompletion() {
    if (workouts.length === 0) return;

    const allCompleted = workouts.every(w => w.currentSet === w.sets);
    if (allCompleted) {
        setTimeout(() => {
            globalOverlay.classList.add('show');
        }, 500);
    }
}

window.resetWorkout = (id, event) => {
    if (event) event.stopPropagation(); // Prevent card click
    const workout = workouts.find(w => w.id === id);
    if (workout) {
        workout.currentSet = 0;
        render();
    }
};

window.deleteWorkout = (id, event) => {
    if (event) event.stopPropagation(); // Prevent card click
    workouts = workouts.filter(w => w.id !== id);
    render();
};

function setupEvents() {
    // Overlays
    resetAllBtn.onclick = () => {
        workouts.forEach(w => w.currentSet = 0);
        globalOverlay.classList.remove('show');
        render();
    };

    closeOverlayBtn.onclick = () => {
        globalOverlay.classList.remove('show');
    };

    // Toggle Panel
    toggleAddBtn.onclick = () => {
        addPanel.classList.toggle('show');
        if (addPanel.classList.contains('show')) {
            workoutNameInput.focus();
        }
    };

    closePanelBtn.onclick = () => {
        addPanel.classList.remove('show');
    };

    // Stepper
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

    // Add Workout
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

            // Hide panel after adding
            addPanel.classList.remove('show');

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
