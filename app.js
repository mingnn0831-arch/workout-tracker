// State Management
let workouts = JSON.parse(localStorage.getItem('workouts')) || [
    { id: Date.now(), name: '팔굽혀펴기', sets: 5, currentSet: 0, reps: 20 }
];

let setsToAdd = 5;
let selectedColor = '#2ecc71';
let editingId = null;

// Touch & Mouse State
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;
let swipedCardId = null;
let currentDraggingId = null;
let justDragged = false;
let isReordering = false;
let longPressTimer = null;
let initialY = 0;
let draggingWrapper = null;
let initialOrder = [];
const dragThreshold = 5;
const LONG_PRESS_DURATION = 500;

// DOM Elements
const workoutList = document.getElementById('workout-list');
const workoutNameInput = document.getElementById('workout-name-input');
const workoutRepsInput = document.getElementById('workout-reps-input');
const setsValueDisplay = document.getElementById('sets-value');
const colorOptionsContainer = document.getElementById('color-options');
const panelOverlay = document.getElementById('panel-overlay');
const minusBtn = document.getElementById('minus-btn');
const plusBtn = document.getElementById('plus-btn');
const addWorkoutBtn = document.getElementById('add-workout-btn');
const addPanel = document.getElementById('add-panel');
const themeToggleBtn = document.getElementById('theme-toggle');
const closePanelBtn = document.getElementById('close-panel-btn');
const globalOverlay = document.getElementById('global-completion-overlay');
const resetAllOverlayBtn = document.getElementById('reset-all-btn'); // Btn inside the completion overlay
const globalResetHeaderBtn = document.getElementById('global-reset-btn'); // New header btn
const resetConfirmModal = document.getElementById('reset-confirm-modal');
const confirmResetBtn = document.getElementById('confirm-reset-btn');
const cancelResetBtn = document.getElementById('cancel-reset-btn');
const closeOverlayBtn = document.getElementById('close-overlay-btn');

// Initialize
function init() {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    setupEvents();
    updateThemeIcon();

    // Remove the inline display:none and use the CSS class for transitions
    addPanel.style.display = 'block';
    globalOverlay.style.display = 'flex'; // Use flex for centering overlay
    resetConfirmModal.style.display = 'flex';
    render();
    lucide.createIcons();
}

function updateThemeIcon() {
    if (!themeToggleBtn) return;
    const isLight = document.body.classList.contains('light-theme');
    themeToggleBtn.innerHTML = `<i data-lucide="${isLight ? 'sun' : 'moon'}"></i>`;
    if (window.lucide) lucide.createIcons();
}

// Render Functions
function render() {
    workoutList.innerHTML = '';

    workouts.forEach(workout => {
        const wrapper = document.createElement('div');
        wrapper.className = 'workout-card-wrapper';
        wrapper.id = `wrapper-${workout.id}`;

        const deleteBg = document.createElement('div');
        deleteBg.className = 'delete-bg';
        deleteBg.innerHTML = '<i data-lucide="trash-2" size="20"></i>';

        // Use mousedown/touchstart for faster response and to avoid event conflicts
        const handleDelete = (e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteWorkout(workout.id);
        };
        deleteBg.onmousedown = handleDelete;
        deleteBg.ontouchstart = handleDelete;

        const card = document.createElement('div');
        card.className = `workout-card ${workout.currentSet === workout.sets ? 'completed' : ''}`;
        card.dataset.id = workout.id;

        // Add touch listeners
        card.ontouchstart = (e) => handleDragStart(e, workout.id, true);
        card.ontouchmove = (e) => handleDragMove(e, workout.id, true);
        card.ontouchend = (e) => handleDragEnd(e, workout.id);

        // Add mouse listeners for desktop swipe simulation
        card.onmousedown = (e) => handleDragStart(e, workout.id, false);
        window.onmousemove = (e) => currentDraggingId && handleDragMove(e, currentDraggingId, false);
        window.onmouseup = (e) => currentDraggingId && handleDragEnd(e, currentDraggingId);

        // Add click listener to the whole card
        card.onclick = (e) => {
            if (e.target.closest('.action-icon-btn')) return;

            if (justDragged) {
                justDragged = false;
                return;
            }

            // If another card is swiped, close it first
            if (swipedCardId && swipedCardId !== workout.id) {
                resetSwipe();
                return;
            }

            // If this card is swiped, close it
            if (swipedCardId === workout.id) {
                resetSwipe();
                return;
            }

            completeSet(workout.id);
        };

        card.innerHTML = `
            <div class="workout-header">
                <div class="workout-info">
                    <div class="workout-name">${workout.name}</div>
                    <div class="workout-reps">${workout.reps ? workout.reps : ''}</div>
                </div>
                <div class="header-actions">
                    <button class="action-icon-btn reset-icon" onclick="resetWorkout(${workout.id}, event)" aria-label="Reset">
                        <i data-lucide="rotate-ccw" size="18"></i>
                    </button>
                    <button class="action-icon-btn edit-icon" onclick="openEditPanel(${workout.id}, event)" aria-label="Edit">
                        <i data-lucide="edit-2" size="18"></i>
                    </button>
                </div>
            </div>
            <div class="progress-dots">
                ${Array.from({ length: workout.sets }).map((_, i) => `
                    <div class="dot ${i < workout.currentSet ? 'filled' : ''}" style="${i < workout.currentSet ? `background-color: ${workout.color || '#ff4d4d'}; border-color: ${workout.color || '#ff4d4d'}; box-shadow: 0 0 10px ${workout.color || '#ff4d4d'}4D;` : ''}"></div>
                `).join('')}
            </div>
        `;

        wrapper.appendChild(deleteBg);
        wrapper.appendChild(card);
        workoutList.appendChild(wrapper);
    });

    // Add "Add Workout" Ghost Card at the bottom
    const addWrapper = document.createElement('div');
    addWrapper.className = 'add-card-wrapper';
    addWrapper.innerHTML = `
        <div class="add-card" onclick="openAddPanel()">
            <i data-lucide="plus"></i>
        </div>
    `;
    workoutList.appendChild(addWrapper);

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

window.deleteWorkout = (id) => {
    workouts = workouts.filter(w => w.id !== id);
    swipedCardId = null;
    render();
};

function closePanel() {
    addPanel.classList.remove('show');
    panelOverlay.classList.remove('show');
    setTimeout(() => {
        if (!addPanel.classList.contains('show')) {
            addPanel.style.display = 'none';
        }
    }, 400);
}

// Drag Handlers (Touch & Mouse)
function handleDragStart(e, id, isTouch) {
    if (swipedCardId && swipedCardId !== id) {
        resetSwipe();
    }

    currentDraggingId = id;
    touchStartX = isTouch ? e.touches[0].clientX : e.clientX;
    touchStartY = isTouch ? e.touches[0].clientY : e.clientY;
    isDragging = false;
    justDragged = false;
    isReordering = false;

    // Start long press timer for reordering
    longPressTimer = setTimeout(() => {
        if (!isDragging) {
            isReordering = true;
            justDragged = true; // Prevent click when reordering
            startReordering(id, touchStartX, touchStartY);
        }
    }, LONG_PRESS_DURATION);

    const card = document.querySelector(`.workout-card[data-id="${id}"]`);
    if (card) card.style.transition = 'none';
}

function handleDragMove(e, id, isTouch) {
    if (!currentDraggingId) return;

    const x = isTouch ? e.touches[0].clientX : e.clientX;
    const y = isTouch ? e.touches[0].clientY : e.clientY;
    const diffX = x - touchStartX;
    const diffY = y - touchStartY;

    if (isReordering) {
        moveReordering(y);
        return;
    }

    if (!isDragging) {
        if (Math.abs(diffX) > dragThreshold || Math.abs(diffY) > dragThreshold) {
            clearTimeout(longPressTimer);
            if (Math.abs(diffX) > Math.abs(diffY)) {
                isDragging = true;
            } else {
                currentDraggingId = null;
                return;
            }
        } else {
            return;
        }
    }

    const card = document.querySelector(`.workout-card[data-id="${id}"]`);
    const wrapper = document.getElementById(`wrapper-${id}`);

    if (card && wrapper) {
        const deleteBg = wrapper.querySelector('.delete-bg');
        const currentSwipeOffset = (swipedCardId === id) ? -90 : 0;
        let targetX = currentSwipeOffset + diffX;
        targetX = Math.min(0, Math.max(targetX, -110));

        card.style.transform = `translateX(${targetX}px)`;
        if (deleteBg) {
            deleteBg.style.opacity = Math.min(Math.abs(targetX) / 60, 1);
        }
    }
}

function handleDragEnd(e, id) {
    clearTimeout(longPressTimer);

    if (isReordering) {
        endReordering();
        currentDraggingId = null;
        isDragging = false;
        isReordering = false;
        return;
    }

    if (!currentDraggingId) {
        isDragging = false;
        return;
    }

    const card = document.querySelector(`.workout-card[data-id="${id}"]`);
    const wrapper = document.getElementById(`wrapper-${id}`);
    const deleteBg = wrapper?.querySelector('.delete-bg');

    if (card) {
        card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const transform = card.style.transform;
        const x = transform ? parseInt(transform.replace(/[^\d.-]/g, '')) : 0;

        if (x < -20) justDragged = true;

        if (x < -40) {
            card.style.transform = 'translateX(-90px)';
            swipedCardId = id;
            if (deleteBg) deleteBg.style.opacity = 1;
        } else {
            card.style.transform = 'translateX(0)';
            swipedCardId = null;
            if (deleteBg) deleteBg.style.opacity = 0;
        }
    }

    currentDraggingId = null;
    isDragging = false;
}

// Reordering Functions
function startReordering(id, x, y) {
    draggingWrapper = document.getElementById(`wrapper-${id}`);
    if (!draggingWrapper) return;

    initialY = y;
    initialOrder = Array.from(document.querySelectorAll('.workout-card-wrapper'));
    draggingWrapper.classList.add('dragging');

    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
}

function moveReordering(y) {
    if (!draggingWrapper) return;

    const diffY = y - initialY;
    draggingWrapper.style.transform = `translateY(${diffY}px)`;

    const draggingRect = draggingWrapper.getBoundingClientRect();
    const draggingCenter = draggingRect.top + draggingRect.height / 2;
    const cardHeight = draggingRect.height + 20; // height + margin

    initialOrder.forEach((wrapper, index) => {
        if (wrapper === draggingWrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const center = rect.top + rect.height / 2;

        const draggingIndex = initialOrder.indexOf(draggingWrapper);
        const currentIndex = initialOrder.indexOf(wrapper);

        // Logical shift
        if (currentIndex > draggingIndex && draggingCenter > center) {
            wrapper.style.transform = `translateY(${-cardHeight}px)`;
        } else if (currentIndex < draggingIndex && draggingCenter < center) {
            wrapper.style.transform = `translateY(${cardHeight}px)`;
        } else {
            wrapper.style.transform = '';
        }
    });
}

function endReordering() {
    if (!draggingWrapper) return;

    // Calculate final index based on transforms
    const wrappers = Array.from(document.querySelectorAll('.workout-card-wrapper'));
    const draggingId = parseInt(draggingWrapper.id.replace('wrapper-', ''));

    const sortedWrappers = wrappers.map(w => {
        const rect = w.getBoundingClientRect();
        return { id: parseInt(w.id.replace('wrapper-', '')), top: rect.top };
    }).sort((a, b) => a.top - b.top);

    const newWorkouts = sortedWrappers.map(sw => workouts.find(w => w.id === sw.id));
    workouts = newWorkouts;

    draggingWrapper.classList.remove('dragging');
    draggingWrapper.style.transform = '';

    // Clear sibling transforms
    wrappers.forEach(w => w.style.transform = '');

    save();
    render();
    draggingWrapper = null;
}

function resetSwipe() {
    if (swipedCardId) {
        const swipedCard = document.querySelector(`.workout-card[data-id="${swipedCardId}"]`);
        const wrapper = document.getElementById(`wrapper-${swipedCardId}`);
        if (swipedCard) {
            swipedCard.style.transition = 'transform 0.3s ease';
            swipedCard.style.transform = 'translateX(0)';
        }
        if (wrapper) {
            const deleteBg = wrapper.querySelector('.delete-bg');
            if (deleteBg) deleteBg.style.opacity = 0;
        }
        swipedCardId = null;
    }
}

window.openEditPanel = (id, event) => {
    if (event) event.stopPropagation();
    const workout = workouts.find(w => w.id === id);
    if (workout) {
        editingId = id;
        workoutNameInput.value = workout.name;
        workoutRepsInput.value = workout.reps || '';
        setsToAdd = workout.sets;
        setsValueDisplay.textContent = setsToAdd;

        // Load existing color
        selectedColor = workout.color || '#ff4d4d';
        updateColorPickerUI();

        document.querySelector('.panel-header h2').textContent = '운동 수정';
        addWorkoutBtn.textContent = '저장하기';
        addPanel.style.display = 'block';
        setTimeout(() => {
            addPanel.classList.add('show');
            panelOverlay.classList.add('show');
        }, 10);
    }
};

window.openAddPanel = () => {
    editingId = null; // Reset editing state
    workoutNameInput.value = '';
    workoutRepsInput.value = '';
    setsToAdd = 5;
    setsValueDisplay.textContent = setsToAdd;

    // Reset color to default (green)
    selectedColor = '#2ecc71';
    updateColorPickerUI();

    document.querySelector('.panel-header h2').textContent = '새 운동 추가';
    addWorkoutBtn.textContent = '운동 추가';
    addPanel.style.display = 'block';
    setTimeout(() => {
        addPanel.classList.add('show');
        panelOverlay.classList.add('show');
    }, 10);
};

function updateColorPickerUI() {
    const dots = colorOptionsContainer.querySelectorAll('.color-dot');
    dots.forEach(dot => {
        if (dot.dataset.color === selectedColor) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function setupEvents() {
    // Overlays
    resetAllOverlayBtn.onclick = () => {
        workouts.forEach(w => w.currentSet = 0);
        globalOverlay.classList.remove('show');
        render();
    };

    globalResetHeaderBtn.onclick = () => {
        if (workouts.length === 0) return;
        resetConfirmModal.classList.add('show');
    };

    confirmResetBtn.onclick = () => {
        workouts.forEach(w => w.currentSet = 0);
        resetConfirmModal.classList.remove('show');
        render();
    };

    cancelResetBtn.onclick = () => {
        resetConfirmModal.classList.remove('show');
    };

    closeOverlayBtn.onclick = () => {
        globalOverlay.classList.remove('show');
    };

    // Event delegation for color dots
    colorOptionsContainer.onclick = (e) => {
        const dot = e.target.closest('.color-dot');
        if (dot) {
            selectedColor = dot.dataset.color;
            updateColorPickerUI();
        }
    };

    closePanelBtn.onclick = closePanel;
    panelOverlay.onclick = closePanel;

    // Theme Toggle
    themeToggleBtn.onclick = () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        updateThemeIcon();
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
            if (editingId) {
                const workout = workouts.find(w => w.id === editingId);
                if (workout) {
                    workout.name = name;
                    workout.reps = workoutRepsInput.value.trim() || null;
                    workout.sets = setsToAdd;
                    workout.color = selectedColor;
                    // Keep currentSet if it's within new sets, otherwise cap it
                    if (workout.currentSet > workout.sets) workout.currentSet = workout.sets;
                }
                editingId = null;
            } else {
                workouts.push({
                    id: Date.now(),
                    name: name,
                    reps: workoutRepsInput.value.trim() || null,
                    sets: setsToAdd,
                    currentSet: 0,
                    color: selectedColor
                });
            }

            workoutNameInput.value = '';
            workoutRepsInput.value = '';
            closePanel();
            render();
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
