// ===================================================================
// Attendance Tracker - script.js
// State Management, Indian Festivals, Admin Controls, Locked % Input,
// Zero-Glow Aesthetic Visualizations, and Responsive Interactions
// ===================================================================

const initialDate = new Date();
let currentMonth = initialDate.getMonth();
let currentYear = initialDate.getFullYear();
let isLoggedIn = false;
let currentUserEmail = null;
let isAdmin = false;

// Filter state for Admin Holiday Manager
let currentHolidayFilter = 'all';
let currentHolidaySearchQuery = '';

// Helper to safely parse YYYY-MM-DD or date objects avoiding timezone shifts
function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const str = String(dateStr);
    
    // If it's an ISO timestamp string like "2026-08-31T18:30:00.000Z", parse as Date and convert to local date
    if (str.includes('T') || str.includes('Z')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
    }
    
    const parts = str.split('-');
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d);
    }
    return new Date(dateStr);
}

// Convert Date to string YYYY-MM-DD for date inputs
function toInputDateString(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Convert Date to dateKey string YYYY-M-D (month 0-indexed)
function toDateKey(year, month, day) {
    return `${year}-${month}-${day}`;
}

// Store data PER USER
let usersData = {};

// ===================================================================
// Official Indian Festival & National Holidays (2026 Calendar)
// Pre-loaded calendar with accurate dates across India
// ===================================================================
const defaultIndianHolidays = {
    // January
    '2026-0-1': { name: "New Year's Day", type: 'National' },
    '2026-0-14': { name: 'Makar Sankranti / Pongal / Magh Bihu', type: 'Festival' },
    '2026-0-23': { name: 'Vasant Panchami / Saraswati Puja', type: 'Festival' },
    '2026-0-26': { name: 'Republic Day', type: 'National' },
    
    // February
    '2026-1-15': { name: 'Maha Shivratri', type: 'Festival' },
    
    // March
    '2026-2-3': { name: 'Holika Dahan', type: 'Festival' },
    '2026-2-4': { name: 'Holi (Festival of Colors)', type: 'Festival' },
    '2026-2-19': { name: 'Ugadi / Gudi Padwa / Chaitra Navratri', type: 'Festival' },
    '2026-2-20': { name: 'Eid-ul-Fitr (Ramzan Eid)', type: 'Festival' },
    '2026-2-27': { name: 'Ram Navami', type: 'Festival' },
    '2026-2-31': { name: 'Mahavir Jayanti', type: 'Festival' },
    
    // April
    '2026-3-3': { name: 'Good Friday', type: 'Festival' },
    '2026-3-5': { name: 'Easter Sunday', type: 'Festival' },
    '2026-3-14': { name: 'Dr. B.R. Ambedkar Jayanti / Baisakhi', type: 'National' },
    
    // May
    '2026-4-1': { name: 'May Day / Labour Day', type: 'National' },
    '2026-4-2': { name: 'Buddha Purnima', type: 'Festival' },
    '2026-4-27': { name: 'Bakrid / Eid al-Adha', type: 'Festival' },
    
    // June
    '2026-5-26': { name: 'Muharram', type: 'Festival' },
    
    // August
    '2026-7-15': { name: 'Independence Day', type: 'National' },
    '2026-7-27': { name: 'Raksha Bandhan', type: 'Festival' },
    '2026-7-28': { name: 'Onam / Thiruvonam', type: 'Festival' },
    
    // September
    '2026-8-4': { name: 'Krishna Janmashtami', type: 'Festival' },
    '2026-8-14': { name: 'Ganesh Chaturthi', type: 'Festival' },
    '2026-8-25': { name: 'Milad-un-Nabi / Eid-e-Milad', type: 'Festival' },
    
    // October
    '2026-9-2': { name: 'Mahatma Gandhi Jayanti', type: 'National' },
    '2026-9-18': { name: 'Maha Saptami (Durga Puja)', type: 'Festival' },
    '2026-9-19': { name: 'Maha Ashtami / Maha Navami', type: 'Festival' },
    '2026-9-20': { name: 'Dussehra / Vijayadashami', type: 'Festival' },
    '2026-9-29': { name: 'Karwa Chauth', type: 'Festival' },
    
    // November
    '2026-10-8': { name: 'Diwali / Deepavali / Lakshmi Puja', type: 'Festival' },
    '2026-10-9': { name: 'Govardhan Puja', type: 'Festival' },
    '2026-10-10': { name: 'Bhai Dooj', type: 'Festival' },
    '2026-10-15': { name: 'Chhath Puja', type: 'Festival' },
    '2026-10-24': { name: 'Guru Nanak Jayanti', type: 'Festival' },
    
    // December
    '2026-11-25': { name: 'Christmas', type: 'Festival' }
};

// Admin configuration with persistent deletedHolidays list and saturdayRules
let adminSettings = {
    workingDays: {},
    holidays: {},
    deletedHolidays: [], // Permanently deleted dates (stay deleted across reloads)
    saturdayRules: {
        secondSaturday: true, // true = holiday, false = working day
        fourthSaturday: true  // true = holiday, false = working day
    }
};

// Date range state
let dateRange = {
    start: null,
    end: null,
    active: false
};

let previousPeriodPercentage = 0;

// Modal tracking
let selectedDayForModal = null;
let selectedDateKeyForModal = null;

// ==================== LOCAL STORAGE FUNCTIONS ====================
function loadData() {
    try {
        const saved = localStorage.getItem('attendanceAppData');
        if (saved) {
            const data = JSON.parse(saved);
            usersData = data.usersData || {};
            
            if (data.adminSettings) {
                adminSettings.workingDays = data.adminSettings.workingDays || {};
                adminSettings.holidays = data.adminSettings.holidays || {};
                adminSettings.deletedHolidays = data.adminSettings.deletedHolidays || [];
                adminSettings.saturdayRules = data.adminSettings.saturdayRules || {
                    secondSaturday: true,
                    fourthSaturday: true
                };
            }
            
            // Purge deleted holidays from active list
            if (adminSettings.deletedHolidays && Array.isArray(adminSettings.deletedHolidays)) {
                adminSettings.deletedHolidays.forEach(k => {
                    delete adminSettings.holidays[k];
                });
            }
        }
        
        // Merge official Indian festival holidays list for any dates not already deleted
        const deletedSet = new Set(adminSettings.deletedHolidays || []);
        Object.entries(defaultIndianHolidays).forEach(([k, def]) => {
            if (!deletedSet.has(k) && !adminSettings.holidays[k]) {
                adminSettings.holidays[k] = def.name;
            }
        });
        
        // Load current user session
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            currentUserEmail = user.email;
            isLoggedIn = true;
            isAdmin = user.email === 'admin@attendance.com';
            updateUIAfterLogin();
        }
        
        // Load date range state
        const savedRange = localStorage.getItem('dateRangeState');
        if (savedRange) {
            const range = JSON.parse(savedRange);
            if (range.start) dateRange.start = parseLocalDate(range.start);
            if (range.end) dateRange.end = parseLocalDate(range.end);
            dateRange.active = range.active || false;
        }
        
        // Load previous percentage
        const savedPrevPercent = localStorage.getItem('previousPercent');
        if (savedPrevPercent) {
            previousPeriodPercentage = parseInt(savedPrevPercent, 10) || 0;
            const prevInput = document.getElementById('previousPercent');
            if (prevInput) prevInput.value = previousPeriodPercentage;
        }
        
        // Default month bounds
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // If range is not actively applied or dates are missing, reset to current month (e.g. 01-09-2026 to 30-09-2026)
        if (!dateRange.active || !dateRange.start || !dateRange.end || isNaN(dateRange.start.getTime())) {
            dateRange.start = defaultStart;
            dateRange.end = defaultEnd;
            dateRange.active = false;
        }
        
        updateDateInputs();
        updateSaturdayRuleUI();
        
    } catch (e) {
        console.error('Error loading data:', e);
    }
}

function saveData() {
    const data = {
        usersData: usersData,
        adminSettings: adminSettings
    };
    localStorage.setItem('attendanceAppData', JSON.stringify(data));
    
    if (currentUserEmail) {
        const user = {
            email: currentUserEmail,
            isAdmin: isAdmin
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    // Save date range state using local YYYY-MM-DD format (prevents UTC timezone date shift to 31-08)
    const rangeState = {
        start: dateRange.start ? toInputDateString(dateRange.start) : null,
        end: dateRange.end ? toInputDateString(dateRange.end) : null,
        active: dateRange.active
    };
    localStorage.setItem('dateRangeState', JSON.stringify(rangeState));
    
    // Save previous percentage
    localStorage.setItem('previousPercent', previousPeriodPercentage.toString());
}

function updateDateInputs() {
    if (dateRange.start) {
        document.getElementById('startDate').value = toInputDateString(dateRange.start);
    }
    if (dateRange.end) {
        document.getElementById('endDate').value = toInputDateString(dateRange.end);
    }
}

// Get current user's attendance data
function getUserData() {
    if (!currentUserEmail) return { present: [], absent: [], notes: {} };
    if (!usersData[currentUserEmail]) {
        usersData[currentUserEmail] = { present: [], absent: [], notes: {} };
    }
    return usersData[currentUserEmail];
}

// Save current user's data
function saveUserData(data) {
    if (currentUserEmail) {
        usersData[currentUserEmail] = data;
        saveData();
    }
}

// Reset current user's attendance
function resetUserAttendance() {
    if (!currentUserEmail) return;
    
    usersData[currentUserEmail] = { present: [], absent: [], notes: {} };
    saveData();
    updateCalendar();
    updateStats();
    const confirmReset = document.getElementById('confirmReset');
    if (confirmReset) confirmReset.classList.remove('active');
    showNotification('All your attendance records have been reset', 'success');
}

// ==================== HOLIDAY CALCULATION ====================
function calculateHolidays(month, year) {
    const holidays = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const secondSatIsHoliday = adminSettings.saturdayRules ? adminSettings.saturdayRules.secondSaturday !== false : true;
    const fourthSatIsHoliday = adminSettings.saturdayRules ? adminSettings.saturdayRules.fourthSaturday !== false : true;
    const deletedList = adminSettings.deletedHolidays || [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const weekOfMonth = Math.ceil(day / 7);
        const dateKey = toDateKey(year, month, day);
        
        // If this date is explicitly deleted/exempted, it is a regular working day
        if (deletedList.includes(dateKey)) {
            continue;
        }
        
        // Active custom or festival holiday
        if (adminSettings.holidays && adminSettings.holidays[dateKey]) {
            holidays.push(day);
            continue;
        }
        
        // All Sundays are off
        if (dayOfWeek === 0) {
            holidays.push(day);
            continue;
        }
        
        // 2nd Saturday
        if (dayOfWeek === 6 && weekOfMonth === 2) {
            if (secondSatIsHoliday) {
                holidays.push(day);
            }
            continue;
        }
        
        // 4th Saturday
        if (dayOfWeek === 6 && weekOfMonth === 4) {
            if (fourthSatIsHoliday) {
                holidays.push(day);
            }
            continue;
        }
    }
    
    return holidays;
}

function getHolidayReason(year, month, day) {
    const dateKey = toDateKey(year, month, day);
    const date = new Date(year, month, day);
    
    if (adminSettings.holidays && adminSettings.holidays[dateKey]) {
        const val = adminSettings.holidays[dateKey];
        return typeof val === 'object' ? val.name : val;
    }
    
    if (date.getDay() === 0) {
        return 'Sunday';
    }
    
    if (date.getDay() === 6) {
        const week = Math.ceil(day / 7);
        if (week === 2) return '2nd Saturday Holiday';
        if (week === 4) return '4th Saturday Holiday';
    }
    
    return 'Holiday';
}

function updateSaturdayRuleUI() {
    const secondSatBadge = document.getElementById('secondSatBadge');
    const fourthSatBadge = document.getElementById('fourthSatBadge');
    const toggleSecondBtn = document.getElementById('toggleSecondSatBtn');
    const toggleFourthBtn = document.getElementById('toggleFourthSatBtn');
    
    if (!secondSatBadge || !fourthSatBadge) return;
    
    const secondSatActive = adminSettings.saturdayRules ? adminSettings.saturdayRules.secondSaturday !== false : true;
    const fourthSatActive = adminSettings.saturdayRules ? adminSettings.saturdayRules.fourthSaturday !== false : true;
    
    if (secondSatActive) {
        secondSatBadge.textContent = 'Active Holiday';
        secondSatBadge.className = 'status-badge status-holiday';
        toggleSecondBtn.textContent = 'Delete Holiday (Make Working)';
        toggleSecondBtn.className = 'btn btn-danger';
    } else {
        secondSatBadge.textContent = 'Regular Working Day';
        secondSatBadge.className = 'status-badge status-working';
        toggleSecondBtn.textContent = 'Restore 2nd Sat as Holiday';
        toggleSecondBtn.className = 'btn btn-present';
    }
    
    if (fourthSatActive) {
        fourthSatBadge.textContent = 'Active Holiday';
        fourthSatBadge.className = 'status-badge status-holiday';
        toggleFourthBtn.textContent = 'Delete Holiday (Make Working)';
        toggleFourthBtn.className = 'btn btn-danger';
    } else {
        fourthSatBadge.textContent = 'Regular Working Day';
        fourthSatBadge.className = 'status-badge status-working';
        toggleFourthBtn.textContent = 'Restore 4th Sat as Holiday';
        toggleFourthBtn.className = 'btn btn-present';
    }
}

// ==================== DOM ELEMENTS & INIT ====================
let homePage, attendancePage, visualizationPage, adminPage;
let authButtons, navButtons;
let loginBtn, signupBtn, startBtn;
let homeNavBtn, attendanceNavBtn, visualNavBtn, adminNavBtn, logoutBtn;
let goHome, goHomeFromAdmin, backToAttendance;
let loginModal, signupModal, closeModal, closeSignupModal, showSignup, showLogin;
let loginForm, signupForm;
let markPresent, markAbsent;
let prevMonthBtn, todayMonthBtn, nextMonthBtn, calendar;
let setWorkingDaysBtn, addHolidayBtn, deleteHolidayBtn;
let applyDateRangeBtn, resetDateRangeBtn, setPreviousPercentBtn;
let showResetConfirm, confirmResetBtn, cancelResetBtn, confirmReset;
let toggleSecondSatBtn, toggleFourthSatBtn, viewNotesBtn;
let restoreAllFestivalsBtn, holidaySearchInput, headerLogo;

document.addEventListener('DOMContentLoaded', function() {
    cacheDomElements();
    loadData();
    setupEventListeners();
    updateCalendar();
    updateStats();
    updateDateRangeInfo();
    refreshHolidayList();
    
    // Display full current date in header badge
    const today = new Date();
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.innerText = today.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Setup Admin month select
    const adminMonthSelect = document.getElementById('adminMonthSelect');
    if (adminMonthSelect) {
        adminMonthSelect.value = currentMonth;
        const key = `${currentYear}-${currentMonth}`;
        const workingDaysVal = adminSettings.workingDays && adminSettings.workingDays[key] ? adminSettings.workingDays[key] : 22;
        document.getElementById('workingDaysInput').value = workingDaysVal;
        document.getElementById('workingDaysInfo').textContent = 
            `Current: ${getMonthName(currentMonth)} ${currentYear} - ${workingDaysVal} working days`;
    }
});

function cacheDomElements() {
    homePage = document.getElementById('homePage');
    attendancePage = document.getElementById('attendancePage');
    visualizationPage = document.getElementById('visualizationPage');
    adminPage = document.getElementById('adminPage');
    
    authButtons = document.getElementById('authButtons');
    navButtons = document.getElementById('navButtons');
    
    loginBtn = document.getElementById('loginBtn');
    signupBtn = document.getElementById('signupBtn');
    startBtn = document.getElementById('startBtn');
    headerLogo = document.getElementById('headerLogo');
    
    homeNavBtn = document.getElementById('homeNavBtn');
    attendanceNavBtn = document.getElementById('attendanceNavBtn');
    visualNavBtn = document.getElementById('visualNavBtn');
    adminNavBtn = document.getElementById('adminNavBtn');
    logoutBtn = document.getElementById('logoutBtn');
    
    goHome = document.getElementById('goHome');
    goHomeFromAdmin = document.getElementById('goHomeFromAdmin');
    backToAttendance = document.getElementById('backToAttendance');
    viewNotesBtn = document.getElementById('viewNotesBtn');
    
    loginModal = document.getElementById('loginModal');
    signupModal = document.getElementById('signupModal');
    closeModal = document.getElementById('closeModal');
    closeSignupModal = document.getElementById('closeSignupModal');
    showSignup = document.getElementById('showSignup');
    showLogin = document.getElementById('showLogin');
    loginForm = document.getElementById('loginForm');
    signupForm = document.getElementById('signupForm');
    
    markPresent = document.getElementById('markPresent');
    markAbsent = document.getElementById('markAbsent');
    prevMonthBtn = document.getElementById('prevMonth');
    todayMonthBtn = document.getElementById('todayMonth');
    nextMonthBtn = document.getElementById('nextMonth');
    calendar = document.getElementById('calendar');
    
    setWorkingDaysBtn = document.getElementById('setWorkingDays');
    addHolidayBtn = document.getElementById('addHoliday');
    deleteHolidayBtn = document.getElementById('deleteHolidayBtn');
    
    applyDateRangeBtn = document.getElementById('applyDateRange');
    resetDateRangeBtn = document.getElementById('resetDateRange');
    setPreviousPercentBtn = document.getElementById('setPreviousPercent');
    
    showResetConfirm = document.getElementById('showResetConfirm');
    confirmResetBtn = document.getElementById('confirmResetBtn');
    cancelResetBtn = document.getElementById('cancelResetBtn');
    confirmReset = document.getElementById('confirmReset');
    
    toggleSecondSatBtn = document.getElementById('toggleSecondSatBtn');
    toggleFourthSatBtn = document.getElementById('toggleFourthSatBtn');
    
    restoreAllFestivalsBtn = document.getElementById('restoreAllFestivalsBtn');
    holidaySearchInput = document.getElementById('holidaySearchInput');
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    startBtn.addEventListener('click', function() {
        if (!isLoggedIn) {
            loginModal.classList.add('active');
        } else {
            showPage('attendance');
        }
    });
    
    if (headerLogo) {
        headerLogo.addEventListener('click', () => showPage('home'));
    }
    
    homeNavBtn.addEventListener('click', () => showPage('home'));
    attendanceNavBtn.addEventListener('click', () => showPage('attendance'));
    
    if (visualNavBtn) {
        visualNavBtn.addEventListener('click', () => showPage('visualization'));
    }
    
    adminNavBtn.addEventListener('click', () => showPage('admin'));
    logoutBtn.addEventListener('click', logout);
    goHome.addEventListener('click', () => showPage('home'));
    goHomeFromAdmin.addEventListener('click', () => showPage('home'));
    if (backToAttendance) {
        backToAttendance.addEventListener('click', () => showPage('attendance'));
    }
    
    if (viewNotesBtn) {
        viewNotesBtn.addEventListener('click', viewAllNotes);
    }
    
    // Auth Modal Controls
    loginBtn.addEventListener('click', () => loginModal.classList.add('active'));
    signupBtn.addEventListener('click', () => signupModal.classList.add('active'));
    closeModal.addEventListener('click', () => loginModal.classList.remove('active'));
    closeSignupModal.addEventListener('click', () => signupModal.classList.remove('active'));
    
    showSignup.addEventListener('click', function(e) {
        e.preventDefault();
        loginModal.classList.remove('active');
        signupModal.classList.add('active');
    });
    
    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        signupModal.classList.remove('active');
        loginModal.classList.add('active');
    });

    // Attendance Marking Modal Event Listeners
    const attendanceModal = document.getElementById('attendanceModal');
    const closeAttendanceModalX = document.getElementById('closeAttendanceModalX');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalPresentBtn = document.getElementById('modalPresentBtn');
    const modalAbsentBtn = document.getElementById('modalAbsentBtn');
    const modalClearBtn = document.getElementById('modalClearBtn');

    const closeAttModal = () => {
        if (attendanceModal) attendanceModal.classList.remove('active');
    };

    if (closeAttendanceModalX) closeAttendanceModalX.addEventListener('click', closeAttModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeAttModal);

    if (modalPresentBtn) {
        modalPresentBtn.addEventListener('click', function() {
            if (!selectedDateKeyForModal) return;
            const userData = getUserData();
            userData.absent = userData.absent.filter(d => d !== selectedDateKeyForModal);
            if (!userData.present.includes(selectedDateKeyForModal)) {
                userData.present.push(selectedDateKeyForModal);
            }
            const note = document.getElementById('modalAbsenceNote').value.trim();
            if (note) {
                if (!userData.notes) userData.notes = {};
                userData.notes[selectedDateKeyForModal] = note;
            } else if (userData.notes && userData.notes[selectedDateKeyForModal]) {
                delete userData.notes[selectedDateKeyForModal];
            }
            saveUserData(userData);
            updateCalendar();
            updateStats();
            closeAttModal();
            showNotification(`Day ${selectedDayForModal} marked as Present`, 'success');
        });
    }

    if (modalAbsentBtn) {
        modalAbsentBtn.addEventListener('click', function() {
            if (!selectedDateKeyForModal) return;
            const userData = getUserData();
            userData.present = userData.present.filter(d => d !== selectedDateKeyForModal);
            if (!userData.absent.includes(selectedDateKeyForModal)) {
                userData.absent.push(selectedDateKeyForModal);
            }
            const note = document.getElementById('modalAbsenceNote').value.trim();
            if (note) {
                if (!userData.notes) userData.notes = {};
                userData.notes[selectedDateKeyForModal] = note;
            }
            saveUserData(userData);
            updateCalendar();
            updateStats();
            closeAttModal();
            showNotification(`Day ${selectedDayForModal} marked as Absent`, 'success');
        });
    }

    if (modalClearBtn) {
        modalClearBtn.addEventListener('click', function() {
            if (!selectedDateKeyForModal) return;
            const userData = getUserData();
            userData.present = userData.present.filter(d => d !== selectedDateKeyForModal);
            userData.absent = userData.absent.filter(d => d !== selectedDateKeyForModal);
            if (userData.notes && userData.notes[selectedDateKeyForModal]) {
                delete userData.notes[selectedDateKeyForModal];
            }
            saveUserData(userData);
            updateCalendar();
            updateStats();
            closeAttModal();
            showNotification(`Attendance cleared for Day ${selectedDayForModal}`, 'info');
        });
    }
    
    // Login Form Submit
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (email === 'admin@attendance.com' && password === 'admin123') {
            currentUserEmail = email;
            isLoggedIn = true;
            isAdmin = true;
            showNotification('Welcome Administrator!', 'success');
            loginModal.classList.remove('active');
            updateUIAfterLogin();
            showPage('admin');
            refreshHolidayList();
            saveData();
        } else if (email && password) {
            currentUserEmail = email;
            isLoggedIn = true;
            isAdmin = false;
            showNotification('Login successful!', 'success');
            loginModal.classList.remove('active');
            updateUIAfterLogin();
            showPage('attendance');
            saveData();
        } else {
            showNotification('Please enter email and password', 'error');
        }
    });
    
    // Signup Form Submit
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;
        
        if (!email || !password || !confirmPass) {
            showNotification('Please fill all fields', 'error');
            return;
        }
        
        if (password !== confirmPass) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (email.toLowerCase() === 'admin@attendance.com') {
            showNotification('This email is reserved for system admin', 'error');
            return;
        }
        
        currentUserEmail = email;
        isLoggedIn = true;
        isAdmin = false;
        showNotification('Account created successfully!', 'success');
        signupModal.classList.remove('active');
        updateUIAfterLogin();
        showPage('attendance');
        saveData();
    });
    
    // Mark Present (Today button)
    markPresent.addEventListener('click', function() {
        if (!isLoggedIn) {
            showNotification('Please login first', 'error');
            loginModal.classList.add('active');
            return;
        }
        
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth();
        const year = today.getFullYear();
        
        const holidays = calculateHolidays(month, year);
        if (holidays.includes(day)) {
            const hReason = getHolidayReason(year, month, day);
            showNotification(`Cannot mark attendance on holiday / off-day: ${hReason}`, 'error');
            return;
        }
        
        const userData = getUserData();
        const dateKey = toDateKey(year, month, day);
        
        if (userData.present.includes(dateKey)) {
            showNotification('Already marked as Present for today', 'error');
            return;
        }
        
        userData.absent = userData.absent.filter(k => k !== dateKey);
        userData.present.push(dateKey);
        
        saveUserData(userData);
        updateCalendar();
        updateStats();
        showNotification('Marked as Present for today', 'success');
    });
    
    // Mark Absent (Today button)
    markAbsent.addEventListener('click', function() {
        if (!isLoggedIn) {
            showNotification('Please login first', 'error');
            loginModal.classList.add('active');
            return;
        }
        
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth();
        const year = today.getFullYear();
        
        const holidays = calculateHolidays(month, year);
        if (holidays.includes(day)) {
            const hReason = getHolidayReason(year, month, day);
            showNotification(`Cannot mark attendance on holiday / off-day: ${hReason}`, 'error');
            return;
        }
        
        const userData = getUserData();
        const dateKey = toDateKey(year, month, day);
        
        if (userData.absent.includes(dateKey)) {
            showNotification('Already marked as Absent for today', 'error');
            return;
        }
        
        userData.present = userData.present.filter(k => k !== dateKey);
        userData.absent.push(dateKey);
        
        const note = prompt('Reason for absence (optional):');
        if (note !== null && note.trim()) {
            if (!userData.notes) userData.notes = {};
            userData.notes[dateKey] = note.trim();
        }
        
        saveUserData(userData);
        updateCalendar();
        updateStats();
        showNotification('Marked as Absent for today', 'success');
    });
    
    // Calendar Navigation
    prevMonthBtn.addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        updateCalendar();
        updateStats();
    });
    
    if (todayMonthBtn) {
        todayMonthBtn.addEventListener('click', function() {
            const now = new Date();
            currentMonth = now.getMonth();
            currentYear = now.getFullYear();
            updateCalendar();
            updateStats();
        });
    }
    
    nextMonthBtn.addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateCalendar();
        updateStats();
    });
    
    // Admin Month Select change listener
    const adminMonthSelect = document.getElementById('adminMonthSelect');
    if (adminMonthSelect) {
        adminMonthSelect.addEventListener('change', function() {
            const selectedMonth = parseInt(this.value, 10);
            const key = `${currentYear}-${selectedMonth}`;
            const daysVal = adminSettings.workingDays && adminSettings.workingDays[key] ? adminSettings.workingDays[key] : 22;
            document.getElementById('workingDaysInput').value = daysVal;
            document.getElementById('workingDaysInfo').textContent = 
                `Current: ${getMonthName(selectedMonth)} ${currentYear} - ${daysVal} working days`;
        });
    }
    
    // Admin: Set Working Days
    setWorkingDaysBtn.addEventListener('click', function() {
        const month = parseInt(document.getElementById('adminMonthSelect').value, 10);
        const days = parseInt(document.getElementById('workingDaysInput').value, 10);
        
        if (isNaN(days) || days < 10 || days > 31) {
            showNotification('Working days must be between 10 and 31', 'error');
            return;
        }
        
        const key = `${currentYear}-${month}`;
        adminSettings.workingDays[key] = days;
        saveData();
        showNotification(`Working days set for ${getMonthName(month)} ${currentYear}: ${days} days`, 'success');
        document.getElementById('workingDaysInfo').textContent = 
            `Current: ${getMonthName(month)} ${currentYear} - ${days} working days`;
        updateStats();
    });
    
    // Admin: Saturday Rule Toggles (2nd and 4th Saturday delete/restore)
    if (toggleSecondSatBtn) {
        toggleSecondSatBtn.addEventListener('click', function() {
            if (!adminSettings.saturdayRules) {
                adminSettings.saturdayRules = { secondSaturday: true, fourthSaturday: true };
            }
            const currentVal = adminSettings.saturdayRules.secondSaturday !== false;
            adminSettings.saturdayRules.secondSaturday = !currentVal;
            saveData();
            updateSaturdayRuleUI();
            refreshHolidayList();
            updateCalendar();
            updateStats();
            
            if (adminSettings.saturdayRules.secondSaturday) {
                showNotification('2nd Saturday restored as Holiday', 'success');
            } else {
                showNotification('2nd Saturday deleted as holiday (now regular working day)', 'info');
            }
        });
    }
    
    if (toggleFourthSatBtn) {
        toggleFourthSatBtn.addEventListener('click', function() {
            if (!adminSettings.saturdayRules) {
                adminSettings.saturdayRules = { secondSaturday: true, fourthSaturday: true };
            }
            const currentVal = adminSettings.saturdayRules.fourthSaturday !== false;
            adminSettings.saturdayRules.fourthSaturday = !currentVal;
            saveData();
            updateSaturdayRuleUI();
            refreshHolidayList();
            updateCalendar();
            updateStats();
            
            if (adminSettings.saturdayRules.fourthSaturday) {
                showNotification('4th Saturday restored as Holiday', 'success');
            } else {
                showNotification('4th Saturday deleted as holiday (now regular working day)', 'info');
            }
        });
    }
    
    // Admin: Add Custom Holiday
    addHolidayBtn.addEventListener('click', function() {
        const dateStr = document.getElementById('holidayDate').value;
        const reason = document.getElementById('holidayReason').value.trim();
        
        if (!dateStr || !reason) {
            showNotification('Please select date and enter reason', 'error');
            return;
        }
        
        const date = parseLocalDate(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const key = toDateKey(year, month, day);
        
        if (adminSettings.deletedHolidays) {
            adminSettings.deletedHolidays = adminSettings.deletedHolidays.filter(k => k !== key);
        }
        
        adminSettings.holidays[key] = reason;
        saveData();
        
        refreshHolidayList();
        
        if (month === currentMonth && year === currentYear) {
            updateCalendar();
            updateStats();
        }
        
        showNotification(`Holiday added: ${dateStr} - ${reason}`, 'success');
        document.getElementById('holidayDate').value = '';
        document.getElementById('holidayReason').value = '';
    });
    
    // Admin: Delete Holiday from date input
    deleteHolidayBtn.addEventListener('click', function() {
        const dateStr = document.getElementById('deleteHolidayDate').value;
        
        if (!dateStr) {
            showNotification('Please select a date to delete', 'error');
            return;
        }
        
        const date = parseLocalDate(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const dateKey = toDateKey(year, month, day);
        
        executeDeleteHoliday(dateKey, dateStr);
        document.getElementById('deleteHolidayDate').value = '';
    });
    
    // Admin: Restore All Default Festivals Button
    if (restoreAllFestivalsBtn) {
        restoreAllFestivalsBtn.addEventListener('click', function() {
            if (confirm('Restore all official Indian festival & national holidays that were removed?')) {
                const defaultKeys = Object.keys(defaultIndianHolidays);
                adminSettings.deletedHolidays = (adminSettings.deletedHolidays || []).filter(k => !defaultKeys.includes(k));
                
                defaultKeys.forEach(k => {
                    adminSettings.holidays[k] = defaultIndianHolidays[k].name;
                });
                
                saveData();
                refreshHolidayList();
                updateCalendar();
                updateStats();
                showNotification('All official Indian festival holidays have been restored!', 'success');
            }
        });
    }
    
    // Admin: Filter Pills for Holidays
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            currentHolidayFilter = this.getAttribute('data-filter') || 'all';
            refreshHolidayList();
        });
    });
    
    // Admin: Real-time search for holidays
    if (holidaySearchInput) {
        holidaySearchInput.addEventListener('input', function() {
            currentHolidaySearchQuery = this.value.toLowerCase().trim();
            refreshHolidayList();
        });
    }
    
    // Date Range: Apply
    applyDateRangeBtn.addEventListener('click', function() {
        const start = parseLocalDate(document.getElementById('startDate').value);
        const end = parseLocalDate(document.getElementById('endDate').value);
        
        if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
            showNotification('Please select valid start and end dates', 'error');
            return;
        }
        
        if (start > end) {
            showNotification('Start date must be before end date', 'error');
            return;
        }
        
        dateRange.start = start;
        dateRange.end = end;
        dateRange.active = true;
        saveData();
        updateStats();
        updateDateRangeInfo();
        showNotification(`Showing attendance from ${formatDate(start)} to ${formatDate(end)}`, 'info');
    });
    
    // Date Range: Reset
    resetDateRangeBtn.addEventListener('click', function() {
        dateRange.active = false;
        const now = new Date();
        dateRange.start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateRange.end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        updateDateInputs();
        saveData();
        updateStats();
        updateDateRangeInfo();
        showNotification('Showing attendance for current month', 'info');
    });
    
    // Set Previous Percentage (Locked with input box)
    setPreviousPercentBtn.addEventListener('click', function() {
        const prevPercentInput = document.getElementById('previousPercent');
        const prevPercent = parseInt(prevPercentInput.value, 10);
        
        if (isNaN(prevPercent) || prevPercent < 0 || prevPercent > 100) {
            showNotification('Please enter a valid percentage (0-100)', 'error');
            return;
        }
        
        previousPeriodPercentage = prevPercent;
        saveData();
        showNotification(`Previous period percentage set to ${prevPercent}%`, 'success');
        updateStats();
    });
    
    // Reset Attendance confirmation controls
    if (showResetConfirm) {
        showResetConfirm.addEventListener('click', function() {
            confirmReset.classList.add('active');
        });
    }
    
    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', function() {
            confirmReset.classList.remove('active');
        });
    }
    
    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', function() {
            resetUserAttendance();
        });
    }
}

// ==================== HOLIDAY LIST & PERSISTENT DELETION ====================
function executeDeleteHoliday(dateKey, displayDateStr) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    const weekOfMonth = Math.ceil(day / 7);
    
    let holidayName = adminSettings.holidays[dateKey];
    if (typeof holidayName === 'object') holidayName = holidayName.name;
    
    if (!holidayName) {
        if (defaultIndianHolidays[dateKey]) {
            holidayName = defaultIndianHolidays[dateKey].name;
        } else if (dayOfWeek === 6 && (weekOfMonth === 2 || weekOfMonth === 4)) {
            holidayName = weekOfMonth === 2 ? '2nd Saturday Holiday' : '4th Saturday Holiday';
        } else if (dayOfWeek === 0) {
            holidayName = 'Sunday';
        } else {
            holidayName = 'Holiday / Off-day';
        }
    }
    
    if (!confirm(`Are you sure you want to remove the holiday "${holidayName}" on ${displayDateStr || formatDate(dateObj)}?\n\nThis date will become a regular working day for all calculations.`)) {
        return;
    }
    
    // 1. Remove from active holidays dictionary
    if (adminSettings.holidays && adminSettings.holidays[dateKey]) {
        delete adminSettings.holidays[dateKey];
    }
    
    // 2. Add to deletedHolidays list so it permanently persists across reloads
    if (!adminSettings.deletedHolidays) {
        adminSettings.deletedHolidays = [];
    }
    if (!adminSettings.deletedHolidays.includes(dateKey)) {
        adminSettings.deletedHolidays.push(dateKey);
    }
    
    saveData();
    refreshHolidayList();
    updateCalendar();
    updateStats();
    
    showNotification(`Removed: ${holidayName} on ${displayDateStr || formatDate(dateObj)}. Converted to working day!`, 'success');
}

function executeRestoreHoliday(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const dateObj = new Date(year, month, day);
    
    if (adminSettings.deletedHolidays) {
        adminSettings.deletedHolidays = adminSettings.deletedHolidays.filter(k => k !== dateKey);
    }
    
    if (defaultIndianHolidays[dateKey]) {
        adminSettings.holidays[dateKey] = defaultIndianHolidays[dateKey].name;
    }
    
    saveData();
    refreshHolidayList();
    updateCalendar();
    updateStats();
    
    showNotification(`Holiday on ${formatDate(dateObj)} restored successfully!`, 'success');
}

function refreshHolidayList() {
    const holidayListDiv = document.getElementById('holidayList');
    if (!holidayListDiv) return;
    
    const holidays = adminSettings.holidays || {};
    const deletedList = adminSettings.deletedHolidays || [];
    const secondSatIsHoliday = adminSettings.saturdayRules ? adminSettings.saturdayRules.secondSaturday !== false : true;
    const fourthSatIsHoliday = adminSettings.saturdayRules ? adminSettings.saturdayRules.fourthSaturday !== false : true;
    
    const items = [];
    
    // 1. Add active holidays
    Object.entries(holidays).forEach(([dateKey, val]) => {
        if (!deletedList.includes(dateKey)) {
            const [y, m, d] = dateKey.split('-').map(Number);
            const name = typeof val === 'object' ? val.name : val;
            let type = 'Custom';
            if (defaultIndianHolidays[dateKey]) {
                type = defaultIndianHolidays[dateKey].type || 'Festival';
            }
            items.push({
                dateKey: dateKey,
                date: new Date(y, m, d),
                reason: name,
                type: type,
                deleted: false
            });
        }
    });
    
    // 2. Add 2nd and 4th Saturdays for current year
    for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(currentYear, m, d);
            if (date.getDay() === 6) {
                const week = Math.ceil(d / 7);
                const dateKey = toDateKey(currentYear, m, d);
                
                if (week === 2 && secondSatIsHoliday && !deletedList.includes(dateKey)) {
                    if (!items.some(i => i.dateKey === dateKey)) {
                        items.push({
                            dateKey: dateKey,
                            date: date,
                            reason: '2nd Saturday Holiday',
                            type: 'Saturday',
                            deleted: false
                        });
                    }
                } else if (week === 4 && fourthSatIsHoliday && !deletedList.includes(dateKey)) {
                    if (!items.some(i => i.dateKey === dateKey)) {
                        items.push({
                            dateKey: dateKey,
                            date: date,
                            reason: '4th Saturday Holiday',
                            type: 'Saturday',
                            deleted: false
                        });
                    }
                }
            }
        }
    }
    
    // 3. Add deleted/exempted holidays
    deletedList.forEach(dateKey => {
        const [y, m, d] = dateKey.split('-').map(Number);
        const date = new Date(y, m, d);
        let reason = 'Deleted Holiday';
        let type = 'Deleted';
        
        if (defaultIndianHolidays[dateKey]) {
            reason = defaultIndianHolidays[dateKey].name;
            type = defaultIndianHolidays[dateKey].type || 'Festival';
        } else if (date.getDay() === 6) {
            const week = Math.ceil(d / 7);
            if (week === 2) { reason = '2nd Saturday (Deleted)'; type = 'Saturday'; }
            if (week === 4) { reason = '4th Saturday (Deleted)'; type = 'Saturday'; }
        }
        
        items.push({
            dateKey: dateKey,
            date: date,
            reason: reason,
            type: type,
            deleted: true
        });
    });
    
    // Update holiday count stat
    const activeCount = items.filter(i => !i.deleted).length;
    const totalHolidaysEl = document.getElementById('totalHolidays');
    if (totalHolidaysEl) totalHolidaysEl.textContent = activeCount;
    
    // Apply Category Filter
    let filteredItems = items;
    if (currentHolidayFilter === 'festival') {
        filteredItems = items.filter(i => i.type === 'Festival' && !i.deleted);
    } else if (currentHolidayFilter === 'national') {
        filteredItems = items.filter(i => i.type === 'National' && !i.deleted);
    } else if (currentHolidayFilter === 'saturday') {
        filteredItems = items.filter(i => i.type === 'Saturday' && !i.deleted);
    } else if (currentHolidayFilter === 'deleted') {
        filteredItems = items.filter(i => i.deleted);
    }
    
    // Apply Search Query
    if (currentHolidaySearchQuery) {
        filteredItems = filteredItems.filter(i => 
            i.reason.toLowerCase().includes(currentHolidaySearchQuery) ||
            formatDate(i.date).toLowerCase().includes(currentHolidaySearchQuery) ||
            i.type.toLowerCase().includes(currentHolidaySearchQuery)
        );
    }
    
    if (filteredItems.length === 0) {
        holidayListDiv.innerHTML = '<p style="color: #64748b; font-style: italic; text-align: center; padding: 22px;">No matching holidays found</p>';
        return;
    }
    
    // Sort items chronologically
    filteredItems.sort((a, b) => a.date - b.date);
    
    let html = `<table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Holiday / Festival Name</th>
                <th>Category</th>
                <th style="text-align: right;">Action</th>
            </tr>
        </thead>
        <tbody>`;
        
    filteredItems.forEach(item => {
        const formattedDate = formatDate(item.date);
        let tagClass = 'tag-custom';
        if (item.type === 'Festival') tagClass = 'tag-festival';
        else if (item.type === 'National') tagClass = 'tag-default';
        else if (item.type === 'Saturday') tagClass = 'tag-saturday';
        
        html += `<tr style="${item.deleted ? 'opacity: 0.65; background: #fff1f2;' : ''}">
            <td style="font-weight: 700; white-space: nowrap;">${formattedDate}</td>
            <td>
                <span style="font-weight: 600; color: var(--text-main);">${item.reason}</span>
                ${item.deleted ? ' <span style="color: #e11d48; font-size: 0.76rem; font-weight: 700; margin-left: 6px;">[Deleted - Working Day]</span>' : ''}
            </td>
            <td><span class="holiday-type-tag ${tagClass}">${item.type}</span></td>
            <td style="text-align: right; white-space: nowrap;">
                ${item.deleted ? `
                    <button class="restore-holiday-btn" onclick="restoreHoliday('${item.dateKey}')">↩ Restore</button>
                ` : `
                    <button class="select-holiday-btn" onclick="selectHoliday('${item.dateKey}')">Select</button>
                    <button class="delete-holiday-btn" onclick="deleteHoliday('${item.dateKey}')">🗑️ Remove</button>
                `}
            </td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    holidayListDiv.innerHTML = html;
}

// Global functions for inline table button clicks
window.selectHoliday = function(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month, day);
    const formattedDate = toInputDateString(date);
    const deleteInput = document.getElementById('deleteHolidayDate');
    if (deleteInput) deleteInput.value = formattedDate;
    showNotification(`Date ${formattedDate} selected for deletion`, 'info');
};

window.deleteHoliday = function(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month, day);
    executeDeleteHoliday(dateKey, formatDate(date));
};

window.restoreHoliday = function(dateKey) {
    executeRestoreHoliday(dateKey);
};

// ==================== PAGE NAVIGATION ====================
function showPage(page) {
    homePage.classList.remove('active-page');
    attendancePage.classList.remove('active-page');
    visualizationPage.classList.remove('active-page');
    adminPage.classList.remove('active-page');
    
    // Update nav button active states
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
    
    if (page === 'home') {
        homePage.classList.add('active-page');
        if (homeNavBtn) homeNavBtn.classList.add('active');
    } else if (page === 'attendance') {
        attendancePage.classList.add('active-page');
        if (attendanceNavBtn) attendanceNavBtn.classList.add('active');
        updateCalendar();
        updateStats();
        if (confirmReset) {
            confirmReset.classList.remove('active');
        }
    } else if (page === 'visualization') {
        visualizationPage.classList.add('active-page');
        if (visualNavBtn) visualNavBtn.classList.add('active');
        updateVisualization();
    } else if (page === 'admin') {
        if (!isAdmin) {
            showNotification('Admin access required (admin@attendance.com)', 'error');
            showPage('attendance');
            return;
        }
        adminPage.classList.add('active-page');
        if (adminNavBtn) adminNavBtn.classList.add('active');
        refreshHolidayList();
        updateAdminStats();
        updateSaturdayRuleUI();
    }
}

function updateUIAfterLogin() {
    authButtons.style.display = 'none';
    navButtons.style.display = 'flex';
    adminNavBtn.style.display = isAdmin ? 'inline-flex' : 'none';
}

function logout() {
    isLoggedIn = false;
    currentUserEmail = null;
    isAdmin = false;
    authButtons.style.display = 'flex';
    navButtons.style.display = 'none';
    localStorage.removeItem('currentUser');
    showPage('home');
    showNotification('Logged out successfully', 'success');
}

// ==================== CALENDAR FUNCTIONS ====================
function updateCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const calMonthEl = document.getElementById('calendarMonth');
    if (calMonthEl) calMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    if (!calendar) return;
    calendar.innerHTML = '';
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'day-header';
        dayEl.textContent = day;
        calendar.appendChild(dayEl);
    });
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    const userData = getUserData();
    const holidays = calculateHolidays(currentMonth, currentYear);
    
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        calendar.appendChild(empty);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.dataset.day = day;
        
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        
        const isHoliday = holidays.includes(day);
        if (isHoliday) {
            dayEl.classList.add('holiday');
        }
        
        const dateKey = toDateKey(currentYear, currentMonth, day);
        if (!isHoliday) {
            if (userData.present.includes(dateKey)) {
                dayEl.classList.add('present');
            } else if (userData.absent.includes(dateKey)) {
                dayEl.classList.add('absent');
            }
        }
        
        const dayNum = document.createElement('div');
        dayNum.className = 'day-number';
        dayNum.textContent = day;
        dayEl.appendChild(dayNum);
        
        const status = document.createElement('div');
        status.className = 'day-status';
        
        if (isHoliday) {
            const hReason = getHolidayReason(currentYear, currentMonth, day);
            status.textContent = hReason;
            dayEl.title = `Holiday: ${hReason}`;
        } else {
            if (dayEl.classList.contains('present')) {
                status.textContent = 'Present';
                status.style.color = 'var(--success)';
            } else if (dayEl.classList.contains('absent')) {
                status.textContent = 'Absent';
                status.style.color = 'var(--danger)';
                if (userData.notes && userData.notes[dateKey]) {
                    status.textContent += ' 📝';
                    dayEl.title = `Note: ${userData.notes[dateKey]}`;
                }
            } else {
                status.textContent = '—';
                status.style.color = '#94a3b8';
            }
        }
        
        dayEl.appendChild(status);
        
        dayEl.addEventListener('click', function() {
            if (!isLoggedIn) {
                showNotification('Please login to mark attendance', 'error');
                loginModal.classList.add('active');
                return;
            }
            if (isHoliday) {
                const hReason = getHolidayReason(currentYear, currentMonth, day);
                showNotification(`📅 Non-working day: ${hReason}`, 'info');
                return;
            }
            handleDayClick(day, toDateKey(currentYear, currentMonth, day));
        });
        
        calendar.appendChild(dayEl);
    }
}

function handleDayClick(day, dateKey) {
    selectedDayForModal = day;
    selectedDateKeyForModal = dateKey;
    
    const [year, month, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(year, month, d);
    const dateStr = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    
    const userData = getUserData();
    const isPresent = userData.present.includes(dateKey);
    const isAbsent = userData.absent.includes(dateKey);
    const existingNote = (userData.notes && userData.notes[dateKey]) || '';
    
    document.getElementById('modalDateTitle').textContent = `Day ${day} Attendance`;
    document.getElementById('modalDateSubtitle').textContent = dateStr;
    
    const statusBadge = document.getElementById('modalStatusBadge');
    const clearBtn = document.getElementById('modalClearBtn');
    const noteInput = document.getElementById('modalAbsenceNote');
    noteInput.value = existingNote;
    
    if (isPresent) {
        statusBadge.style.background = '#ecfdf5';
        statusBadge.style.color = '#047857';
        statusBadge.textContent = '✓ Currently marked as PRESENT';
        clearBtn.style.display = 'inline-block';
    } else if (isAbsent) {
        statusBadge.style.background = '#fff1f2';
        statusBadge.style.color = '#be123c';
        statusBadge.textContent = '✕ Currently marked as ABSENT';
        clearBtn.style.display = 'inline-block';
    } else {
        statusBadge.style.background = '#f1f5f9';
        statusBadge.style.color = '#475569';
        statusBadge.textContent = '○ Currently NOT MARKED';
        clearBtn.style.display = 'none';
    }
    
    document.getElementById('attendanceModal').classList.add('active');
}

// ==================== STATS FUNCTIONS ====================
function updateStats() {
    if (!isLoggedIn) return;
    
    const userData = getUserData();
    let presentCount = 0;
    let absentCount = 0;
    let totalWorkingDays = 0;
    
    let startDate, endDate;
    if (dateRange.active && dateRange.start && dateRange.end) {
        startDate = new Date(dateRange.start);
        endDate = new Date(dateRange.end);
    } else {
        startDate = new Date(currentYear, currentMonth, 1);
        endDate = new Date(currentYear, currentMonth + 1, 0);
    }
    
    let current = new Date(startDate);
    while (current <= endDate) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const day = current.getDate();
        const dateKey = toDateKey(year, month, day);
        
        const holidays = calculateHolidays(month, year);
        if (holidays.includes(day)) {
            current.setDate(current.getDate() + 1);
            continue;
        }
        
        totalWorkingDays++;
        
        if (userData.present.includes(dateKey)) {
            presentCount++;
        } else if (userData.absent.includes(dateKey)) {
            absentCount++;
        }
        
        current.setDate(current.getDate() + 1);
    }
    
    let currentPercentage = 0;
    if (totalWorkingDays > 0) {
        currentPercentage = Math.round((presentCount / totalWorkingDays) * 100);
    }
    
    let averagePercentage = currentPercentage;
    const hasPrevious = previousPeriodPercentage > 0;
    
    if (hasPrevious) {
        averagePercentage = Math.round((previousPeriodPercentage + currentPercentage) / 2);
    }
    
    const attendancePercentEl = document.getElementById('attendancePercent');
    if (attendancePercentEl) attendancePercentEl.textContent = averagePercentage + '%';
    
    const presentCountEl = document.getElementById('presentCount');
    if (presentCountEl) presentCountEl.textContent = presentCount;
    
    const absentCountEl = document.getElementById('absentCount');
    if (absentCountEl) absentCountEl.textContent = absentCount;
    
    const workingDaysEl = document.getElementById('workingDays');
    if (workingDaysEl) workingDaysEl.textContent = totalWorkingDays;
    
    const rollingDisplay = document.getElementById('rollingDisplay');
    if (rollingDisplay) {
        if (hasPrevious) {
            rollingDisplay.style.display = 'inline-block';
            rollingDisplay.textContent = `Average of Prev (${previousPeriodPercentage}%) & Current (${currentPercentage}%)`;
        } else {
            rollingDisplay.style.display = 'none';
        }
    }
    
    let needed = 0;
    const neededDaysEl = document.getElementById('neededDays');
    if (neededDaysEl) {
        if (averagePercentage >= 75) {
            neededDaysEl.textContent = 'Goal achieved (≥ 75%)';
            neededDaysEl.style.color = 'var(--success)';
        } else {
            if (totalWorkingDays > 0) {
                if (hasPrevious) {
                    const targetCurrent = Math.max(0, 150 - previousPeriodPercentage);
                    const targetPresent = Math.ceil((targetCurrent / 100) * totalWorkingDays);
                    needed = Math.max(0, targetPresent - presentCount);
                } else {
                    needed = Math.ceil((0.75 * totalWorkingDays) - presentCount);
                    needed = Math.max(0, needed);
                }
            }
            neededDaysEl.textContent = `Need ${needed} more days for 75%`;
            neededDaysEl.style.color = 'var(--danger)';
        }
    }
    
    let status = 'No Data';
    if (totalWorkingDays > 0 || hasPrevious) {
        if (averagePercentage >= 90) status = 'Excellent 🌟';
        else if (averagePercentage >= 80) status = 'Good 👍';
        else if (averagePercentage >= 75) status = 'Satisfactory 👌';
        else status = 'Needs Improvement ⚠️';
    }
    
    const statusTextEl = document.getElementById('statusText');
    if (statusTextEl) statusTextEl.textContent = status;
    
    const dateRangeInfo = document.getElementById('dateRangeInfo');
    if (dateRangeInfo) {
        if (dateRange.active) {
            dateRangeInfo.textContent = `Range: ${formatDate(startDate)} - ${formatDate(endDate)}`;
        } else {
            dateRangeInfo.textContent = `Current month: ${getMonthName(currentMonth)} ${currentYear}`;
        }
    }
    
    // Store variables globally for visualization page
    window.averagePercentage = averagePercentage;
    window.attendancePercentage = averagePercentage;
    window.currentPercentage = currentPercentage;
    window.previousPeriodPercentage = previousPeriodPercentage;
    window.totalWorkingDays = totalWorkingDays;
    window.presentCount = presentCount;
    window.absentCount = absentCount;
    window.neededDays = needed;
}

// ===================================================================
// VISUALIZATION FUNCTIONS (Zero Glow, Sunset Aesthetic)
// Note: NO "Current %" is displayed anywhere on this page as requested.
// ===================================================================
function updateVisualization() {
    const avgPercent = window.averagePercentage !== undefined 
        ? window.averagePercentage 
        : (parseInt(document.getElementById('attendancePercent').textContent, 10) || 0);
    const prevPercent = window.previousPeriodPercentage || 0;
    const workingDays = window.totalWorkingDays || 0;
    const presentDays = window.presentCount || 0;
    const absentDays = window.absentCount || 0;
    const needed = window.neededDays || 0;
    const hasPrev = prevPercent > 0;
    
    // Aesthetic sunset gradient ring (soft coral-rose to translucent track)
    const currentRing = document.getElementById('currentRing');
    if (currentRing) {
        currentRing.style.background = `conic-gradient(#fb7185 0% ${avgPercent}%, rgba(255, 255, 255, 0.45) ${avgPercent}% 100%)`;
    }
    
    const visualPercentage = document.getElementById('visualPercentage');
    if (visualPercentage) {
        visualPercentage.textContent = avgPercent + '%';
    }
    
    // Goal badge beneath the ring
    const visualGoalBadge = document.getElementById('visualGoalBadge');
    if (visualGoalBadge) {
        if (avgPercent >= 75) {
            visualGoalBadge.textContent = '🎉 Goal Achieved (≥ 75%)';
            visualGoalBadge.style.color = '#047857';
            visualGoalBadge.style.background = 'rgba(236, 253, 245, 0.95)';
            visualGoalBadge.style.borderColor = '#a7f3d0';
        } else {
            visualGoalBadge.textContent = `🎯 Target: 75% | Need ${needed} more days`;
            visualGoalBadge.style.color = '#be123c';
            visualGoalBadge.style.background = 'rgba(255, 241, 242, 0.95)';
            visualGoalBadge.style.borderColor = '#fecdd3';
        }
    }
    
    // Metric Cards Grid: Present Days, Absent Days, Goal Status (NO Current %)
    const visualPresentVal = document.getElementById('visualPresentVal');
    const visualWorkingSub = document.getElementById('visualWorkingSub');
    if (visualPresentVal) visualPresentVal.textContent = presentDays;
    if (visualWorkingSub) visualWorkingSub.textContent = `Out of ${workingDays} total working days`;
    
    const visualAbsentVal = document.getElementById('visualAbsentVal');
    const visualAbsentSub = document.getElementById('visualAbsentSub');
    if (visualAbsentVal) visualAbsentVal.textContent = absentDays;
    if (visualAbsentSub) visualAbsentSub.textContent = absentDays === 0 ? 'Perfect record!' : 'Recorded absences';
    
    const visualGoalVal = document.getElementById('visualGoalVal');
    const visualGoalSub = document.getElementById('visualGoalSub');
    if (visualGoalVal) {
        visualGoalVal.textContent = avgPercent >= 75 ? 'Achieved 🎯' : `Need ${needed} Days`;
        visualGoalVal.style.color = avgPercent >= 75 ? 'var(--success)' : 'var(--primary)';
    }
    if (visualGoalSub) visualGoalSub.textContent = avgPercent >= 75 ? 'Requirement met (≥ 75%)' : 'To reach 75% target';
    
    // Performance Progress Bar
    const rollingBar = document.getElementById('rollingBar');
    const rollingPercentValue = document.getElementById('rollingPercentValue');
    const visualRollingBreakdown = document.getElementById('visualRollingBreakdown');
    
    if (rollingBar) rollingBar.style.width = avgPercent + '%';
    if (rollingPercentValue) rollingPercentValue.textContent = avgPercent + '%';
    
    if (visualRollingBreakdown) {
        if (hasPrev) {
            visualRollingBreakdown.textContent = `Overall Attendance is at ${avgPercent}% (incorporating your ${prevPercent}% previous baseline setting).`;
        } else {
            visualRollingBreakdown.textContent = `Overall Attendance is at ${avgPercent}% based on ${presentDays} present days out of ${workingDays} working days.`;
        }
    }
}

function updateAdminStats() {
    const userCount = Object.keys(usersData).length || 1;
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) totalUsersEl.textContent = userCount;
    
    const activeUsersEl = document.getElementById('activeUsers');
    if (activeUsersEl) activeUsersEl.textContent = isLoggedIn ? 1 : 0;
}

function updateDateRangeInfo() {
    const rangeInfo = document.getElementById('rangeInfo');
    if (!rangeInfo) return;
    
    if (dateRange.active && dateRange.start && dateRange.end) {
        rangeInfo.textContent = `Active Range Filter: ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`;
    } else {
        rangeInfo.textContent = 'Select date range and click Apply Range to view filtered attendance';
    }
}

// ==================== UTILITY FUNCTIONS ====================
function viewAllNotes() {
    if (!isLoggedIn) {
        showNotification('Please login first', 'error');
        loginModal.classList.add('active');
        return;
    }
    
    const userData = getUserData();
    if (!userData.notes || Object.keys(userData.notes).length === 0) {
        showNotification('No absence notes saved yet.', 'info');
        return;
    }
    
    let notesText = '=== YOUR ABSENCE NOTES ===\n\n';
    for (const dateKey in userData.notes) {
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month, day);
        notesText += `📅 ${date.toDateString()}\n`;
        notesText += `📝 ${userData.notes[dateKey]}\n`;
        notesText += '─'.repeat(30) + '\n';
    }
    
    alert(notesText);
}

function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMonthName(month) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month] || '';
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 350);
    }, 3200);
}
